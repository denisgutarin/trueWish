const { getDb } = require('./db');

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {number} telegram_id
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} token
 */

/**
 * Получить пользователя по токену
 * @param {string} token
 * @returns {Promise<User | undefined>}
 */
async function getUserByToken(token) {
  const db = getDb();
  return await db.prepare('SELECT * FROM users WHERE token = ?').get(token);
}

/**
 * Проверить код подтверждения
 * @param {string} token
 * @param {string} code
 * @returns {Promise<User | null>}
 */
async function verifyCode(token, code) {
  const db = getDb();
  const user = await db.prepare(`
    SELECT * FROM users 
    WHERE token = ? 
      AND verification_code = ? 
      AND verification_code_expires > CURRENT_TIMESTAMP
  `).get(token, code);
  
  if (user) {
    await db.prepare('UPDATE users SET verification_code = NULL, verification_code_expires = NULL WHERE id = ?')
      .run(user.id);
  }
  
  return user || null;
}

/**
 * Получить все темы
 * @returns {Promise<Array>}
 */
async function getAllTopics() {
  const db = getDb();
  return await db.prepare('SELECT * FROM topics ORDER BY order_index, id').all();
}

/**
 * Получить материалы темы
 * @param {number} topicId
 * @returns {Promise<Array>}
 */
async function getMaterialsByTopicId(topicId) {
  const db = getDb();
  return await db.prepare('SELECT * FROM materials WHERE topic_id = ? ORDER BY order_index, id').all(topicId);
}

/**
 * Проверить доступ пользователя к теме
 * @param {number} userId
 * @param {number} topicId
 * @returns {Promise<boolean>}
 */
async function hasAccess(userId, topicId) {
  const db = getDb();
  const result = await db.prepare('SELECT * FROM user_topic_access WHERE user_id = ? AND topic_id = ?')
    .get(userId, topicId);
  return !!result;
}

/**
 * Получить прогресс пользователя по теме
 * @param {number} userId
 * @param {number} topicId
 * @returns {Promise<Array>}
 */
async function getUserProgressForTopic(userId, topicId) {
  const db = getDb();
  return await db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND topic_id = ?')
    .all(userId, topicId);
}

/**
 * Сохранить ответ пользователя
 * @param {number} userId
 * @param {number} materialId
 * @param {string} answerText
 * @returns {Promise<Object>}
 */
async function saveAnswer(userId, materialId, answerText) {
  const db = getDb();
  const info = await db.prepare('INSERT INTO user_answers (user_id, material_id, answer_text) VALUES (?, ?, ?)')
    .run(userId, materialId, answerText);
  return { lastID: info.lastInsertRowid, changes: info.changes };
}

/**
 * Отметить материал как завершенный
 * @param {number} userId
 * @param {number} topicId
 * @param {number} materialId
 * @returns {Promise<Object>}
 */
async function markCompleted(userId, topicId, materialId) {
  const db = getDb();
  const info = await db.prepare(`
    INSERT INTO user_progress (user_id, topic_id, material_id, completed, completed_at)
    VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, topic_id, material_id) DO UPDATE SET
      completed = TRUE,
      completed_at = CURRENT_TIMESTAMP
  `).run(userId, topicId, materialId);
  return { lastID: info.lastInsertRowid, changes: info.changes };
}

/**
 * Получить доступные темы пользователя
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getUserAccessibleTopics(userId) {
  const db = getDb();
  return await db.prepare(`
    SELECT t.*, uta.granted_at 
    FROM topics t
    INNER JOIN user_topic_access uta ON t.id = uta.topic_id
    WHERE uta.user_id = ?
    ORDER BY t.order_index, t.id
  `).all(userId);
}

module.exports = {
  getUserByToken,
  verifyCode,
  getAllTopics,
  getMaterialsByTopicId,
  hasAccess,
  getUserProgressForTopic,
  saveAnswer,
  markCompleted,
  getUserAccessibleTopics
};
