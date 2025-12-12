import db, { sql } from './db.js';

class UserModelImpl {
  async createUser(telegramId, username, phone, firstName, lastName) {
    await db.init();
    const { customAlphabet } = await import('nanoid');
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);
    const token = nanoid();
    
    await sql`
      INSERT INTO users (telegram_id, username, phone, first_name, last_name, token)
      VALUES (${telegramId}, ${username}, ${phone}, ${firstName}, ${lastName}, ${token})
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        token = COALESCE(users.token, EXCLUDED.token)
    `;
    return this.getUserByTelegramId(telegramId);
  }

  async getUserByToken(token) {
    await db.init();
    const rows = await sql`SELECT * FROM users WHERE token = ${token}`;
    return rows[0] || null;
  }

  async setVerificationCode(userId, code) {
    await db.init();
    await sql`
      UPDATE users 
      SET verification_code = ${code}, 
          verification_code_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
      WHERE id = ${userId}
    `;
  }

  async verifyCode(token, code) {
    await db.init();
    const rows = await sql`
      SELECT * FROM users 
      WHERE token = ${token}
        AND verification_code = ${code}
        AND verification_code_expires > NOW()
    `;
    const user = rows[0];
    
    if (user) {
      await sql`UPDATE users SET verification_code = NULL, verification_code_expires = NULL WHERE id = ${user.id}`;
    }
    
    return user;
  }

  async getUserByTelegramId(telegramId) {
    await db.init();
    const rows = await sql`SELECT * FROM users WHERE telegram_id = ${telegramId}`;
    return rows[0] || null;
  }

  async getAllUsers() {
    await db.init();
    return await sql`SELECT * FROM users ORDER BY created_at DESC`;
  }

  async getUserById(id) {
    await db.init();
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    return rows[0] || null;
  }
}

class TopicModelImpl {
  async createTopic(title, description, orderIndex) {
    await db.init();
    const rows = await sql`INSERT INTO topics (title, description, order_index) VALUES (${title}, ${description}, ${orderIndex}) RETURNING id`;
    return { lastID: rows[0]?.id || null, changes: 1 };
  }

  async getAllTopics() {
    await db.init();
    return await sql`SELECT * FROM topics ORDER BY order_index, id`;
  }

  async getTopicById(id) {
    await db.init();
    const rows = await sql`SELECT * FROM topics WHERE id = ${id}`;
    return rows[0] || null;
  }

  async updateTopic(id, title, description, orderIndex) {
    await db.init();
    await sql`UPDATE topics SET title = ${title}, description = ${description}, order_index = ${orderIndex} WHERE id = ${id}`;
  }

  async deleteTopic(id) {
    await db.init();
    await sql`DELETE FROM topics WHERE id = ${id}`;
  }
}

class MaterialModelImpl {
  async createMaterial(topicId, type, fileId, content, taskText, orderIndex) {
    await db.init();
    const rows = await sql`
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES (${topicId}, ${type}, ${fileId}, ${content}, ${taskText}, ${orderIndex})
      RETURNING id
    `;
    return { lastID: rows[0]?.id || null, changes: 1 };
  }

  async getMaterialsByTopicId(topicId) {
    await db.init();
    return await sql`SELECT * FROM materials WHERE topic_id = ${topicId} ORDER BY order_index, id`;
  }

  async getMaterialById(id) {
    await db.init();
    const rows = await sql`SELECT * FROM materials WHERE id = ${id}`;
    return rows[0] || null;
  }

  async updateMaterial(id, type, fileId, content, taskText, orderIndex) {
    await db.init();
    await sql`
      UPDATE materials SET type = ${type}, file_id = ${fileId}, content = ${content}, task_text = ${taskText}, order_index = ${orderIndex}
      WHERE id = ${id}
    `;
  }

  async deleteMaterial(id) {
    await db.init();
    await sql`DELETE FROM materials WHERE id = ${id}`;
  }
}

class AccessModelImpl {
  async grantAccess(userId, topicId) {
    await db.init();
    await sql`INSERT INTO user_topic_access (user_id, topic_id) VALUES (${userId}, ${topicId}) ON CONFLICT DO NOTHING`;
  }

  async revokeAccess(userId, topicId) {
    await db.init();
    await sql`DELETE FROM user_topic_access WHERE user_id = ${userId} AND topic_id = ${topicId}`;
  }

  async hasAccess(userId, topicId) {
    await db.init();
    const rows = await sql`SELECT * FROM user_topic_access WHERE user_id = ${userId} AND topic_id = ${topicId}`;
    return rows.length > 0;
  }

  async getUserAccessibleTopics(userId) {
    await db.init();
    return await sql`
      SELECT t.* FROM topics t
      INNER JOIN user_topic_access uta ON t.id = uta.topic_id
      WHERE uta.user_id = ${userId}
      ORDER BY t.order_index, t.id
    `;
  }

  async getTopicAccessForUser(userId) {
    await db.init();
    return await sql`SELECT topic_id FROM user_topic_access WHERE user_id = ${userId}`;
  }
}

class ProgressModelImpl {
  async getOrCreateProgress(userId, topicId, materialId) {
    await db.init();
    // Пытаемся вставить, игнорируем если уже существует
    await sql`
      INSERT INTO user_progress (user_id, topic_id, material_id)
      VALUES (${userId}, ${topicId}, ${materialId})
      ON CONFLICT (user_id, topic_id, material_id) DO NOTHING
    `;
    
    // Получаем запись (существующую или только что созданную)
    const rows = await sql`SELECT * FROM user_progress WHERE user_id = ${userId} AND topic_id = ${topicId} AND material_id = ${materialId}`;
    return rows[0] || null;
  }

  async markCompleted(userId, topicId, materialId) {
    await db.init();
    await sql`
      UPDATE user_progress
      SET completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND topic_id = ${topicId} AND material_id = ${materialId}
    `;
  }

  async getUserProgressForTopic(userId, topicId) {
    await db.init();
    return await sql`SELECT * FROM user_progress WHERE user_id = ${userId} AND topic_id = ${topicId}`;
  }

  async isTopicCompleted(userId, topicId) {
    await db.init();
    const rows = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed
      FROM user_progress
      WHERE user_id = ${userId} AND topic_id = ${topicId}
    `;
    const result = rows[0];
    return result && result.total > 0 && result.total === result.completed;
  }

  async getCurrentMaterial(userId, topicId) {
    await db.init();
    const rows = await sql`
      SELECT m.* FROM materials m
      LEFT JOIN user_progress up ON 
        m.id = up.material_id AND up.user_id = ${userId} AND up.topic_id = ${topicId}
      WHERE m.topic_id = ${topicId} AND (up.completed IS NULL OR up.completed = FALSE)
      ORDER BY m.order_index, m.id
      LIMIT 1
    `;
    return rows[0] || null;
  }
}

class AnswerModelImpl {
  async saveAnswer(userId, materialId, answerText) {
    await db.init();
    const rows = await sql`INSERT INTO user_answers (user_id, material_id, answer_text) VALUES (${userId}, ${materialId}, ${answerText}) RETURNING id`;
    return { lastID: rows[0]?.id || null, changes: 1 };
  }

  async getAnswersForMaterial(userId, materialId) {
    await db.init();
    return await sql`SELECT * FROM user_answers WHERE user_id = ${userId} AND material_id = ${materialId} ORDER BY submitted_at`;
  }

  async getAllAnswersForUser(userId) {
    await db.init();
    return await sql`
      SELECT ua.*, m.task_text, t.title as topic_title
      FROM user_answers ua
      INNER JOIN materials m ON ua.material_id = m.id
      INNER JOIN topics t ON m.topic_id = t.id
      WHERE ua.user_id = ${userId}
      ORDER BY ua.submitted_at DESC
    `;
  }
}

export const UserModel = new UserModelImpl();
export const TopicModel = new TopicModelImpl();
export const MaterialModel = new MaterialModelImpl();
export const AccessModel = new AccessModelImpl();
export const ProgressModel = new ProgressModelImpl();
export const AnswerModel = new AnswerModelImpl();
