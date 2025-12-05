const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const { UserModel, TopicModel, MaterialModel, AccessModel, ProgressModel, AnswerModel } = require('./database/models');

class AdminPanel {
  constructor(port, password) {
    this.app = express();
    this.port = port;
    this.passwordHash = bcrypt.hashSync(password, 10);
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(bodyParser.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    this.app.use(session({
      secret: 'truewish-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 часа
    }));
  }

  authMiddleware(req, res, next) {
    if (req.session.authenticated) {
      next();
    } else {
      res.redirect('/login');
    }
  }

  setupRoutes() {
    // Страница входа
    this.app.get('/login', (req, res) => {
      if (req.session.authenticated) {
        return res.redirect('/');
      }
      res.render('login', { error: null });
    });

    this.app.post('/login', (req, res) => {
      const { password } = req.body;
      
      if (bcrypt.compareSync(password, this.passwordHash)) {
        req.session.authenticated = true;
        res.redirect('/');
      } else {
        res.render('login', { error: 'Неверный пароль' });
      }
    });

    this.app.get('/logout', (req, res) => {
      req.session.destroy();
      res.redirect('/login');
    });

    // Главная страница - список пользователей
    this.app.get('/', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const users = await UserModel.getAllUsers();
        res.render('users', { users });
      } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).send('Ошибка загрузки пользователей');
      }
    });

    // Страница управления пользователем
    this.app.get('/user/:id', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const user = await UserModel.getUserById(userId);
        
        if (!user) {
          return res.status(404).send('Пользователь не найден');
        }

        const allTopics = await TopicModel.getAllTopics();
        const userAccess = await AccessModel.getTopicAccessForUser(userId);
        const userAccessIds = userAccess.map(a => a.topic_id);

        // Получаем прогресс и ответы для каждой темы
        const topicsWithData = await Promise.all(
          allTopics.map(async (topic) => {
            const hasAccess = userAccessIds.includes(topic.id);
            const materials = await MaterialModel.getMaterialsByTopicId(topic.id);
            const progress = await ProgressModel.getUserProgressForTopic(userId, topic.id);
            
            // Получаем ответы для каждого материала
            const materialsWithAnswers = await Promise.all(
              materials.map(async (material) => {
                const answers = await AnswerModel.getAnswersForMaterial(userId, material.id);
                const materialProgress = progress.find(p => p.material_id === material.id);
                return {
                  ...material,
                  answers,
                  completed: materialProgress?.completed || false
                };
              })
            );

            return {
              ...topic,
              hasAccess,
              materials: materialsWithAnswers
            };
          })
        );

        res.render('user-detail', { user, topics: topicsWithData });
      } catch (error) {
        console.error('Error loading user details:', error);
        res.status(500).send('Ошибка загрузки данных пользователя');
      }
    });

    // API для изменения доступа
    this.app.post('/api/access', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const { userId, topicId, grant } = req.body;
        
        if (grant) {
          await AccessModel.grantAccess(userId, topicId);
        } else {
          await AccessModel.revokeAccess(userId, topicId);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error updating access:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API для отметки прохождения задания
    this.app.post('/api/complete', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const { userId, topicId, materialId, completed } = req.body;
        
        if (completed) {
          await ProgressModel.markCompleted(userId, topicId, materialId);
        } else {
          // Если нужно снять отметку о завершении
          const sql = `
            UPDATE user_progress
            SET completed = 0, completed_at = NULL
            WHERE user_id = ? AND topic_id = ? AND material_id = ?
          `;
          await require('./database/db').run(sql, [userId, topicId, materialId]);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error updating completion:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Страница управления темами
    this.app.get('/topics', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const topics = await TopicModel.getAllTopics();
        res.render('topics', { topics });
      } catch (error) {
        console.error('Error loading topics:', error);
        res.status(500).send('Ошибка загрузки тем');
      }
    });

    // API для создания/редактирования тем
    this.app.post('/api/topic', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const { id, title, description, orderIndex } = req.body;
        
        if (id) {
          await TopicModel.updateTopic(id, title, description, orderIndex || 0);
        } else {
          await TopicModel.createTopic(title, description, orderIndex || 0);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error saving topic:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Страница управления материалами темы
    this.app.get('/topic/:id/materials', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const topicId = parseInt(req.params.id);
        const topic = await TopicModel.getTopicById(topicId);
        const materials = await MaterialModel.getMaterialsByTopicId(topicId);
        
        res.render('materials', { topic, materials });
      } catch (error) {
        console.error('Error loading materials:', error);
        res.status(500).send('Ошибка загрузки материалов');
      }
    });

    // API для создания/редактирования материалов
    this.app.post('/api/material', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const { id, topicId, type, fileId, content, taskText, orderIndex } = req.body;
        
        if (id) {
          await MaterialModel.updateMaterial(id, type, fileId, content, taskText, orderIndex || 0);
        } else {
          await MaterialModel.createMaterial(topicId, type, fileId, content, taskText, orderIndex || 0);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error saving material:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`✅ Admin panel running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Admin panel stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = AdminPanel;
