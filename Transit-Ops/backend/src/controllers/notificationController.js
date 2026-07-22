const prisma = require("../config/db");

// GET /api/notifications
async function getAllVisible(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { targetRole: req.user.role }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/unread-count
async function getUnreadCount(req, res, next) {
  try {
    const count = await prisma.notification.count({
      where: {
        OR: [
          { userId: req.user.id },
          { targetRole: req.user.role }
        ],
        isRead: false
      }
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res, next) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        OR: [
          { userId: req.user.id },
          { targetRole: req.user.role }
        ]
      },
      data: { isRead: true }
    });
    res.json({ success: true, updated: notification.count });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/mark-all-read
async function markAllAsRead(req, res, next) {
  try {
    const notifications = await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: req.user.id },
          { targetRole: req.user.role }
        ],
        isRead: false
      },
      data: { isRead: true }
    });
    res.json({ success: true, updated: notifications.count });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllVisible,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
