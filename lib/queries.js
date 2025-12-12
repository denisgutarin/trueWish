import db, { sql } from './bot/database/db.js';

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
  await db.init();
  const rows = await sql`SELECT * FROM users WHERE token = ${token}`;
  return rows[0] || null;
}

/**
 * Проверить код подтверждения
 * @param {string} token
 * @param {string} code
 * @returns {Promise<User | null>}
 */
async function verifyCode(token, code) {
  await db.init();
  const rows = await sql`
    SELECT * FROM users 
    WHERE token = ${token}
      AND verification_code = ${code}
      AND verification_code_expires > CURRENT_TIMESTAMP
  `;
  const user = rows[0];
  
  if (user) {
    await sql`UPDATE users SET verification_code = NULL, verification_code_expires = NULL WHERE id = ${user.id}`;
  }
  
  return user || null;
}

/**
 * Получить все темы
 * @returns {Promise<Array>}
 */
async function getAllTopics() {
  await db.init();
  return (await sql`SELECT * FROM topics ORDER BY order_index, id`) ?? [];
}

/**
 * Получить материалы темы
 * @param {number} topicId
 * @returns {Promise<Array>}
 */
async function getMaterialsByTopicId(topicId) {
  await db.init();
  return (await sql`SELECT * FROM materials WHERE topic_id = ${topicId} ORDER BY order_index, id`)  ?? [];
}

/**
 * Проверить доступ пользователя к теме
 * @param {number} userId
 * @param {number} topicId
 * @returns {Promise<boolean>}
 */
async function hasAccess(userId, topicId) {
  await db.init();
  const rows = await sql`SELECT * FROM user_topic_access WHERE user_id = ${userId} AND topic_id = ${topicId}`;
  return rows.length > 0;
}

/**
 * Получить прогресс пользователя по теме
 * @param {number} userId
 * @param {number} topicId
 * @returns {Promise<Array>}
 */
async function getUserProgressForTopic(userId, topicId) {
  await db.init();
  return await sql`SELECT * FROM user_progress WHERE user_id = ${userId} AND topic_id = ${topicId}`;
}

/**
 * Сохранить ответ пользователя
 * @param {number} userId
 * @param {number} materialId
 * @param {string} answerText
 * @returns {Promise<Object>}
 */
async function saveAnswer(userId, materialId, answerText) {
  await db.init();
  const rows = await sql`INSERT INTO user_answers (user_id, material_id, answer_text) VALUES (${userId}, ${materialId}, ${answerText}) RETURNING id`;
  return { lastID: rows[0]?.id || null, changes: 1 };
}

/**
 * Отметить материал как завершенный
 * @param {number} userId
 * @param {number} topicId
 * @param {number} materialId
 * @returns {Promise<Object>}
 */
async function markCompleted(userId, topicId, materialId) {
  await db.init();
  await sql`
    INSERT INTO user_progress (user_id, topic_id, material_id, completed, completed_at)
    VALUES (${userId}, ${topicId}, ${materialId}, TRUE, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, topic_id, material_id) DO UPDATE SET
      completed = TRUE,
      completed_at = CURRENT_TIMESTAMP
  `;
  return { changes: 1 };
}

/**
 * Получить доступные темы пользователя
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getUserAccessibleTopics(userId) {
  await db.init();
  return await sql`
    SELECT t.*, uta.granted_at 
    FROM topics t
    INNER JOIN user_topic_access uta ON t.id = uta.topic_id
    WHERE uta.user_id = ${userId}
    ORDER BY t.order_index, t.id
  `;
}

export {
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
