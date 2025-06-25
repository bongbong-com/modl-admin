import { Router } from 'express';
import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { IModlServer as IModlServerShared, ISystemLog as ISystemLogShared, ModlServerSchema, SystemLogSchema } from 'modl-shared-web';
import { requireAuth } from '../middleware/authMiddleware';

type ISystemLog = ISystemLogShared & Document;
type IModlServer = IModlServerShared & Document;

const router = Router();

// Apply authentication to all analytics routes
router.use(requireAuth);

// Analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // --- Overview Metrics ---
    const ModlServerModel = mongoose.model<IModlServer>('ModlServer', ModlServerSchema);
    const totalServers = await ModlServerModel.countDocuments();
    const activeServers = await ModlServerModel.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    
    const userAndTicketCounts = await ModlServerModel.aggregate([
      { $group: { _id: null, totalUsers: { $sum: '$userCount' }, totalTickets: { $sum: '$ticketCount' } } }
    ]);
    const { totalUsers = 0, totalTickets = 0 } = userAndTicketCounts[0] || {};

    const currentPeriodServers = await ModlServerModel.countDocuments({ createdAt: { $gte: startDate } });
    const previousPeriodServers = await ModlServerModel.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } });
    const serverGrowthRate = previousPeriodServers > 0 ? ((currentPeriodServers - previousPeriodServers) / previousPeriodServers) * 100 : currentPeriodServers > 0 ? 100 : 0;
    
    // Note: User growth rate is indicative and depends on external updates to userCount
    const userGrowthRate = 0; // Placeholder as real user growth tracking is complex

    // --- Server Metrics ---
    const planDistribution = await ModlServerModel.aggregate([
      { $group: { _id: '$plan', value: { $sum: 1 } } },
      { $project: { name: '$_id', value: 1, _id: 0 } }
    ]);
    const totalPlanServers = planDistribution.reduce((acc, p) => acc + p.value, 1);
    const byPlan = planDistribution.map(p => ({ ...p, percentage: Math.round((p.value / totalPlanServers) * 100) }));

    const byStatus = await ModlServerModel.aggregate([
      { $group: { _id: '$provisioningStatus', value: { $sum: 1 } } },
      { $project: { name: '$_id', value: 1, color: 1, _id: 0 } } // color is a placeholder
    ]);

    const registrationTrend = await ModlServerModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, servers: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', servers: 1, _id: 0 } }
    ]);
    // Add cumulative trend
    let cumulative = 0;
    const trendWithCumulative = registrationTrend.map((d: { date: string; servers: number }) => {
      cumulative += d.servers;
      return { ...d, cumulative };
    });

    // --- Usage Statistics ---
    const topServersByUsers = await ModlServerModel.find({ userCount: { $gt: 0 } }).sort({ userCount: -1 }).limit(10).lean();
    
    const serverActivity = await ModlServerModel.aggregate([
      { $match: { updatedAt: { $gte: startDate } } },
      {
        $facet: {
          active: [
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } }
          ],
          registered: [
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const activityMap = new Map();
    serverActivity[0].active.forEach((d: { _id: string; count: number }) => activityMap.set(d._id, { activeServers: d.count }));
    serverActivity[0].registered.forEach((d: { _id: string; count: number }) => {
      const existing = activityMap.get(d._id) || {};
      activityMap.set(d._id, { ...existing, newRegistrations: d.count });
    });
    const serverActivityTrend = Array.from(activityMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a,b) => a.date.localeCompare(b.date));


    const geoDist = await ModlServerModel.aggregate([
        { $match: { region: { $ne: null } } },
        { $group: { _id: '$region', servers: { $sum: 1 } } },
        { $sort: { servers: -1 } }
    ]);
    const totalRegionServers = geoDist.reduce((acc, r) => acc + r.servers, 0);
    const geographicDistribution = geoDist.map(r => ({ region: r._id, servers: r.servers, percentage: Math.round((r.servers/totalRegionServers)*100) }));

    // --- System Health ---
    const SystemLogModel = mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
    const errorRates = await SystemLogModel.aggregate([
        { $match: { timestamp: { $gte: startDate }, level: { $in: ['critical', 'error', 'warning']} } },
        { $group: { 
            _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, level: '$level' },
            count: { $sum: 1 }
        }},
        { $group: {
            _id: '$_id.date',
            critical: { $sum: { $cond: [{ $eq: ['$_id.level', 'critical'] }, '$count', 0]}},
            errors: { $sum: { $cond: [{ $eq: ['$_id.level', 'error'] }, '$count', 0]}},
            warnings: { $sum: { $cond: [{ $eq: ['$_id.level', 'warning'] }, '$count', 0]}}
        }},
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', critical: 1, errors: 1, warnings: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: { totalServers, activeServers, totalUsers, totalTickets, serverGrowthRate: serverGrowthRate.toFixed(2), userGrowthRate: userGrowthRate.toFixed(2) },
        serverMetrics: { byPlan, byStatus, registrationTrend: trendWithCumulative },
        usageStatistics: { topServersByUsers, serverActivity: serverActivityTrend, geographicDistribution },
        systemHealth: { errorRates }
      }
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics data' });
  }
});

// Export analytics data
router.post('/export', async (req, res) => {
  try {
    const { type, range = '30d' } = req.body;
    
    // In a real implementation, this would generate actual export files
    const filename = `modl-analytics-${range}-${Date.now()}.${type}`;
    
    switch (type) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('Date,Servers,Users,Tickets\n2024-01-01,100,1500,820\n2024-01-02,102,1520,835');
        break;
        
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          exportDate: new Date().toISOString(),
          range,
          data: {
            servers: 100,
            users: 1500,
            tickets: 820
          }
        });
        break;
        
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Mock PDF data
        res.send(Buffer.from('Mock PDF data'));
        break;
        
      default:
        res.status(400).json({ message: 'Invalid export type' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
});

// Generate comprehensive report
router.post('/report', async (req, res) => {
  try {
    const { type, dateRange, sections } = req.body;
    
    // Mock report generation
    const reportId = `report_${Date.now()}`;
    
    // In a real implementation, this would:
    // 1. Generate the report asynchronously
    // 2. Store it temporarily
    // 3. Send notification when ready
    
    res.json({
      reportId,
      status: 'generating',
      estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
      downloadUrl: `/api/analytics/reports/${reportId}/download`
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Usage statistics
router.get('/usage', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Mock usage statistics
    res.json({
      userEngagement: {
        dailyActiveUsers: Math.floor(Math.random() * 1000) + 500,
        weeklyActiveUsers: Math.floor(Math.random() * 5000) + 2000,
        monthlyActiveUsers: Math.floor(Math.random() * 15000) + 8000
      },
      featureUsage: [
        { feature: 'Player Lookup', usage: 85, trend: 'up' },
        { feature: 'Ticket System', usage: 92, trend: 'stable' },
        { feature: 'Punishment System', usage: 78, trend: 'up' },
        { feature: 'API Access', usage: 45, trend: 'down' }
      ],
      resourceUtilization: {
        storage: 67,
        bandwidth: 43,
        apiCalls: 82,
        databaseQueries: 71
      }
    });
  } catch (error) {
    console.error('Usage statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch usage statistics' });
  }
});

// Historical data tracking
router.get('/historical', async (req, res) => {
  try {
    const { metric, range = '30d' } = req.query;
    
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const historical = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      let value;
      switch (metric) {
        case 'servers':
          value = Math.floor(Math.random() * 10) + 90;
          break;
        case 'users':
          value = Math.floor(Math.random() * 100) + 1400;
          break;
        case 'tickets':
          value = Math.floor(Math.random() * 50) + 800;
          break;
        default:
          value = Math.floor(Math.random() * 100);
      }
      
      historical.push({
        date: date.toISOString().split('T')[0],
        value
      });
    }
    
    res.json({
      metric,
      range,
      data: historical
    });
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({ message: 'Failed to fetch historical data' });
  }
});

export default router; 