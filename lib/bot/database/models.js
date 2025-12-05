const db = require('./db');

class UserModel {
  async createUser(telegramId, username, phone, firstName, lastName) {
    const { customAlphabet } = await import('nanoid');
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);
    const token = nanoid();
    
    const query = `
      INSERT INTO users (telegram_id, username, phone, first_name, last_name, token)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        token = COALESCE(users.token, EXCLUDED.token)
      RETURNING id
    `;
    await db.run(query, [telegramId, username, phone, firstName, lastName, token]);
    return this.getUserByTelegramId(telegramId);
  }

  async getUserByToken(token) {
    return db.get('SELECT * FROM users WHERE token = $1', [token]);
  }

  async setVerificationCode(userId, code) {
    const query = `
      UPDATE users 
      SET verification_code = $1, 
          verification_code_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
      WHERE id = $2
    `;
    return db.run(query, [code, userId]);
  }

  async verifyCode(token, code) {
    const query = `
      SELECT * FROM users 
      WHERE token = $1 
        AND verification_code = $2
        AND verification_code_expires > NOW()
    `;
    const user = await db.get(query, [token, code]);
    
    if (user) {
      await db.run('UPDATE users SET verification_code = NULL, verification_code_expires = NULL WHERE id = $1', [user.id]);
    }
    
    return user;
  }

  async getUserByTelegramId(telegramId) {
    return db.get('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  }

  async getAllUsers() {
    return db.all('SELECT * FROM users ORDER BY created_at DESC');
  }

  async getUserById(id) {
    return db.get('SELECT * FROM users WHERE id = $1', [id]);
  }
}

class TopicModel {
  async createTopic(title, description, orderIndex) {
    const query = 'INSERT INTO topics (title, description, order_index) VALUES ($1, $2, $3) RETURNING id';
    return db.run(query, [title, description, orderIndex]);
  }

  async getAllTopics() {
    return db.all('SELECT * FROM topics ORDER BY order_index, id');
  }

  async getTopicById(id) {
    return db.get('SELECT * FROM topics WHERE id = $1', [id]);
  }

  async updateTopic(id, title, description, orderIndex) {
    const query = 'UPDATE topics SET title = $1, description = $2, order_index = $3 WHERE id = $4';
    return db.run(query, [title, description, orderIndex, id]);
  }

  async deleteTopic(id) {
    return db.run('DELETE FROM topics WHERE id = $1', [id]);
  }
}

class MaterialModel {
  async createMaterial(topicId, type, fileId, content, taskText, orderIndex) {
    const query = `
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    return db.run(query, [topicId, type, fileId, content, taskText, orderIndex]);
  }

  async getMaterialsByTopicId(topicId) {
    return db.all('SELECT * FROM materials WHERE topic_id = $1 ORDER BY order_index, id', [topicId]);
  }

  async getMaterialById(id) {
    return db.get('SELECT * FROM materials WHERE id = $1', [id]);
  }

  async updateMaterial(id, type, fileId, content, taskText, orderIndex) {
    const query = `
      UPDATE materials SET type = $1, file_id = $2, content = $3, task_text = $4, order_index = $5
      WHERE id = $6
    `;
    return db.run(query, [type, fileId, content, taskText, orderIndex, id]);
  }

  async deleteMaterial(id) {
    return db.run('DELETE FROM materials WHERE id = $1', [id]);
  }
}

class AccessModel {
  async grantAccess(userId, topicId) {
    const query = 'INSERT INTO user_topic_access (user_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING';
    return db.run(query, [userId, topicId]);
  }

  async revokeAccess(userId, topicId) {
    const query = 'DELETE FROM user_topic_access WHERE user_id = $1 AND topic_id = $2';
    return db.run(query, [userId, topicId]);
  }

  async hasAccess(userId, topicId) {
    const result = await db.get(
      'SELECT * FROM user_topic_access WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );
    return !!result;
  }

  async getUserAccessibleTopics(userId) {
    const query = `
      SELECT t.* FROM topics t
      INNER JOIN user_topic_access uta ON t.id = uta.topic_id
      WHERE uta.user_id = $1
      ORDER BY t.order_index, t.id
    `;
    return db.all(query, [userId]);
  }

  async getTopicAccessForUser(userId) {
    const query = `
      SELECT topic_id FROM user_topic_access WHERE user_id = $1
    `;
    return db.all(query, [userId]);
  }
}

class ProgressModel {
  async getOrCreateProgress(userId, topicId, materialId) {
    // Пытаемся вставить, игнорируем если уже существует
    const query = `
      INSERT INTO user_progress (user_id, topic_id, material_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, topic_id, material_id) DO NOTHING
    `;
    await db.run(query, [userId, topicId, materialId]);
    
    // Получаем запись (существующую или только что созданную)
    const progress = await db.get(
      'SELECT * FROM user_progress WHERE user_id = $1 AND topic_id = $2 AND material_id = $3',
      [userId, topicId, materialId]
    );

    return progress;
  }

  async markCompleted(userId, topicId, materialId) {
    const query = `
      UPDATE user_progress
      SET completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND topic_id = $2 AND material_id = $3
    `;
    return db.run(query, [userId, topicId, materialId]);
  }

  async getUserProgressForTopic(userId, topicId) {
    return db.all(
      'SELECT * FROM user_progress WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );
  }

  async isTopicCompleted(userId, topicId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed
      FROM user_progress
      WHERE user_id = $1 AND topic_id = $2
    `;
    const result = await db.get(query, [userId, topicId]);
    return result && result.total > 0 && result.total === result.completed;
  }

  async getCurrentMaterial(userId, topicId) {
    const query = `
      SELECT m.* FROM materials m
      LEFT JOIN user_progress up ON 
        m.id = up.material_id AND up.user_id = $1 AND up.topic_id = $2
      WHERE m.topic_id = $3 AND (up.completed IS NULL OR up.completed = FALSE)
      ORDER BY m.order_index, m.id
      LIMIT 1
    `;
    return db.get(query, [userId, topicId, topicId]);
  }
}

class AnswerModel {
  async saveAnswer(userId, materialId, answerText) {
    const query = 'INSERT INTO user_answers (user_id, material_id, answer_text) VALUES ($1, $2, $3) RETURNING id';
    return db.run(query, [userId, materialId, answerText]);
  }

  async getAnswersForMaterial(userId, materialId) {
    return db.all(
      'SELECT * FROM user_answers WHERE user_id = $1 AND material_id = $2 ORDER BY submitted_at',
      [userId, materialId]
    );
  }

  async getAllAnswersForUser(userId) {
    const query = `
      SELECT ua.*, m.task_text, t.title as topic_title
      FROM user_answers ua
      INNER JOIN materials m ON ua.material_id = m.id
      INNER JOIN topics t ON m.topic_id = t.id
      WHERE ua.user_id = $1
      ORDER BY ua.submitted_at DESC
    `;
    return db.all(query, [userId]);
  }
}

module.exports = {
  UserModel: new UserModel(),
  TopicModel: new TopicModel(),
  MaterialModel: new MaterialModel(),
  AccessModel: new AccessModel(),
  ProgressModel: new ProgressModel(),
  AnswerModel: new AnswerModel(),
};
