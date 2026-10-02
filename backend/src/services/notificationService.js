const prisma = require("../config/db");

async function createNotification({ userId, targetRole, type, message, relatedEntityId }) {
  try {
    if (!userId && !targetRole) {
      console.warn("Notification skipped: Must provide either userId or targetRole");
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId || null,
        targetRole: targetRole || null,
        type,
        message,
        relatedEntityId: relatedEntityId || null,
      },
    });
    
    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

module.exports = {
  createNotification,
};
