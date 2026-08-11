import { AnalyticsSnapshot } from './model.js';
import type { AnalyticsSnapshotCreate, IAnalyticsSnapshot } from './model.js';

export const analyticsRepository = {
  async create(data: AnalyticsSnapshotCreate): Promise<IAnalyticsSnapshot> {
    return AnalyticsSnapshot.create(data);
  },

  async findFresh(
    workspaceId: string,
    connectionId: string,
    from: Date,
    to: Date,
    freshAfter: Date,
  ): Promise<IAnalyticsSnapshot | null> {
    return AnalyticsSnapshot.findOne({
      workspaceId,
      connectionId,
      rangeFrom: from,
      rangeTo: to,
      collectedAt: { $gte: freshAfter },
    })
      .sort({ collectedAt: -1 })
      .exec();
  },

  async findLatest(
    workspaceId: string,
    connectionId: string,
  ): Promise<IAnalyticsSnapshot | null> {
    return AnalyticsSnapshot.findOne({ workspaceId, connectionId })
      .sort({ collectedAt: -1 })
      .exec();
  },
};
