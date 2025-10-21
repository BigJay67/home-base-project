const Analytics = require('../models/Analytics');

class AnalyticsService {
    static async trackReceiptDownload(paymentId, userId, userAgent) {
        try {
            await Analytics.create({
                type: 'receipt_download',
                paymentId,
                userId,
                metadata: {
                    userAgent,
                    timestamp: new Date(),
                    medium: 'web_download'
                }
            });
            console.log('📊 Tracked receipt download:', paymentId);
        } catch (error) {
            console.error('Error tracking receipt download:', error);
        }
    }

    static async trackReceiptEmail(paymentId, userId, recipientEmail) {
        try {
            await Analytics.create({
                type: 'receipt_email',
                paymentId,
                userId,
                metadata: {
                    recipientEmail,
                    timestamp: new Date(),
                    medium: 'email'
                }
            });
            console.log('📊 Tracked receipt email:', paymentId);
        } catch (error) {
            console.error('Error tracking receipt email:', error);
        }
    }

    static async trackReceiptView(paymentId, userId, source = 'direct') {
        try {
            await Analytics.create({
                type: 'receipt_view',
                paymentId,
                userId,
                metadata: {
                    source,
                    timestamp: new Date(),
                    medium: 'web_view'
                }
            });
            console.log('📊 Tracked receipt view:', paymentId);
        } catch (error) {
            console.error('Error tracking receipt view:', error);
        }
    }

    static async trackReceiptShare(paymentId, userId, shareMethod) {
        try {
            await Analytics.create({
                type: 'receipt_share',
                paymentId,
                userId,
                metadata: {
                    shareMethod,
                    timestamp: new Date(),
                    medium: 'share'
                }
            });
            console.log('📊 Tracked receipt share:', paymentId);
        } catch (error) {
            console.error('Error tracking receipt share:', error);
        }
    }

    static async getReceiptStats(paymentId) {
        try {
            const stats = await Analytics.aggregate([
                { $match: { paymentId } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        lastActivity: { $max: '$metadata.timestamp' }
                    }
                }
            ]);

            return stats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    lastActivity: stat.lastActivity
                };
                return acc;
            }, {});
        } catch (error) {
            console.error('Error getting receipt stats:', error);
            return {};
        }
    }

    static async getUserReceiptActivity(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const activity = await Analytics.aggregate([
                {
                    $match: {
                        userId,
                        'metadata.timestamp': { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            type: '$type',
                            date: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$metadata.timestamp'
                                }
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id.date': 1 }
                }
            ]);

            return activity;
        } catch (error) {
            console.error('Error getting user receipt activity:', error);
            return [];
        }
    }

    static async getPopularReceipts(limit = 10, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const popular = await Analytics.aggregate([
                {
                    $match: {
                        'metadata.timestamp': { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$paymentId',
                        totalViews: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'receipt_view'] }, 1, 0]
                            }
                        },
                        totalDownloads: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'receipt_download'] }, 1, 0]
                            }
                        },
                        totalEmails: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'receipt_email'] }, 1, 0]
                            }
                        },
                        totalShares: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'receipt_share'] }, 1, 0]
                            }
                        },
                        lastActivity: { $max: '$metadata.timestamp' }
                    }
                },
                {
                    $addFields: {
                        totalEngagement: {
                            $add: ['$totalViews', '$totalDownloads', '$totalEmails', '$totalShares']
                        }
                    }
                },
                {
                    $sort: { totalEngagement: -1 }
                },
                {
                    $limit: limit
                }
            ]);

            return popular;
        } catch (error) {
            console.error('Error getting popular receipts:', error);
            return [];
        }
    }
}

module.exports = AnalyticsService;
