const db = require('./db');

class UserModel {
  async createUser(telegramId, username, phone, firstName, lastName) {
    const sql = `
      INSERT INTO users (telegram_id, username, phone, first_name, last_name)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = excluded.username,
        phone = excluded.phone,
        first_name = excluded.first_name,
        last_name = excluded.last_name
    `;
    const result = await db.run(sql, [telegramId, username, phone, firstName, lastName]);
    return this.getUserByTelegramId(telegramId);
  }

  async getUserByTelegramId(telegramId) {
    return db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
  }

  async getAllUsers() {
    return db.all('SELECT * FROM users ORDER BY created_at DESC');
  }

  async getUserById(id) {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }
}

class TopicModel {
  async createTopic(title, description, orderIndex) {
    const sql = 'INSERT INTO topics (title, description, order_index) VALUES (?, ?, ?)';
    return db.run(sql, [title, description, orderIndex]);
  }

  async getAllTopics() {
    return db.all('SELECT * FROM topics ORDER BY order_index, id');
  }

  async getTopicById(id) {
    return db.get('SELECT * FROM topics WHERE id = ?', [id]);
  }

  async updateTopic(id, title, description, orderIndex) {
    const sql = 'UPDATE topics SET title = ?, description = ?, order_index = ? WHERE id = ?';
    return db.run(sql, [title, description, orderIndex, id]);
  }

  async deleteTopic(id) {
    return db.run('DELETE FROM topics WHERE id = ?', [id]);
  }
}

class MaterialModel {
  async createMaterial(topicId, type, fileId, content, taskText, orderIndex) {
    const sql = `
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    return db.run(sql, [topicId, type, fileId, content, taskText, orderIndex]);
  }

  async getMaterialsByTopicId(topicId) {
    return db.all('SELECT * FROM materials WHERE topic_id = ? ORDER BY order_index, id', [topicId]);
  }

  async getMaterialById(id) {
    return db.get('SELECT * FROM materials WHERE id = ?', [id]);
  }

  async updateMaterial(id, type, fileId, content, taskText, orderIndex) {
    const sql = `
      UPDATE materials SET type = ?, file_id = ?, content = ?, task_text = ?, order_index = ?
      WHERE id = ?
    `;
    return db.run(sql, [type, fileId, content, taskText, orderIndex, id]);
  }

  async deleteMaterial(id) {
    return db.run('DELETE FROM materials WHERE id = ?', [id]);
  }
}

class AccessModel {
  async grantAccess(userId, topicId) {
    const sql = 'INSERT OR IGNORE INTO user_topic_access (user_id, topic_id) VALUES (?, ?)';
    return db.run(sql, [userId, topicId]);
  }

  async revokeAccess(userId, topicId) {
    const sql = 'DELETE FROM user_topic_access WHERE user_id = ? AND topic_id = ?';
    return db.run(sql, [userId, topicId]);
  }

  async hasAccess(userId, topicId) {
    const result = await db.get(
      'SELECT * FROM user_topic_access WHERE user_id = ? AND topic_id = ?',
      [userId, topicId]
    );
    return !!result;
  }

  async getUserAccessibleTopics(userId) {
    const sql = `
      SELECT t.* FROM topics t
      INNER JOIN user_topic_access uta ON t.id = uta.topic_id
      WHERE uta.user_id = ?
      ORDER BY t.order_index, t.id
    `;
    return db.all(sql, [userId]);
  }

  async getTopicAccessForUser(userId) {
    const sql = `
      SELECT topic_id FROM user_topic_access WHERE user_id = ?
    `;
    return db.all(sql, [userId]);
  }
}

class ProgressModel {
  async getOrCreateProgress(userId, topicId, materialId) {
    let progress = await db.get(
      'SELECT * FROM user_progress WHERE user_id = ? AND topic_id = ? AND material_id = ?',
      [userId, topicId, materialId]
    );

    if (!progress) {
      const sql = `
        INSERT INTO user_progress (user_id, topic_id, material_id)
        VALUES (?, ?, ?)
      `;
      const result = await db.run(sql, [userId, topicId, materialId]);
      progress = await db.get('SELECT * FROM user_progress WHERE id = ?', [result.lastID]);
    }

    return progress;
  }

  async markCompleted(userId, topicId, materialId) {
    const sql = `
      UPDATE user_progress
      SET completed = 1, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND topic_id = ? AND material_id = ?
    `;
    return db.run(sql, [userId, topicId, materialId]);
  }

  async getUserProgressForTopic(userId, topicId) {
    return db.all(
      'SELECT * FROM user_progress WHERE user_id = ? AND topic_id = ?',
      [userId, topicId]
    );
  }

  async isTopicCompleted(userId, topicId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM user_progress
      WHERE user_id = ? AND topic_id = ?
    `;
    const result = await db.get(sql, [userId, topicId]);
    return result && result.total > 0 && result.total === result.completed;
  }

  async getCurrentMaterial(userId, topicId) {
    // Найти первый незавершенный материал
    const sql = `
      SELECT m.* FROM materials m
      LEFT JOIN user_progress up ON 
        m.id = up.material_id AND up.user_id = ? AND up.topic_id = ?
      WHERE m.topic_id = ? AND (up.completed IS NULL OR up.completed = 0)
      ORDER BY m.order_index, m.id
      LIMIT 1
    `;
    return db.get(sql, [userId, topicId, topicId]);
  }
}

class AnswerModel {
  async saveAnswer(userId, materialId, answerText) {
    const sql = 'INSERT INTO user_answers (user_id, material_id, answer_text) VALUES (?, ?, ?)';
    return db.run(sql, [userId, materialId, answerText]);
  }

  async getAnswersForMaterial(userId, materialId) {
    return db.all(
      'SELECT * FROM user_answers WHERE user_id = ? AND material_id = ? ORDER BY submitted_at',
      [userId, materialId]
    );
  }

  async getAllAnswersForUser(userId) {
    const sql = `
      SELECT ua.*, m.task_text, t.title as topic_title
      FROM user_answers ua
      INNER JOIN materials m ON ua.material_id = m.id
      INNER JOIN topics t ON m.topic_id = t.id
      WHERE ua.user_id = ?
      ORDER BY ua.submitted_at DESC
    `;
    return db.all(sql, [userId]);
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
