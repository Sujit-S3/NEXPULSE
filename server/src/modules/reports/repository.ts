import mongoose from 'mongoose';
import { Report } from './model.js';
import type { IReport } from './model.js';

export const reportRepository = {
  async create(data: {
    workspaceId: string;
    connectionId: string;
    createdBy: string;
    title: string;
    provider: IReport['provider'];
    providerAccountId: string;
    rangeFrom: Date;
    rangeTo: Date;
    collectedAt: Date;
    metrics: IReport['metrics'];
    unavailable: string[];
  }): Promise<IReport> {
    return Report.create({
      ...data,
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      connectionId: new mongoose.Types.ObjectId(data.connectionId),
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
      status: 'ready',
    });
  },

  async list(
    workspaceId: string,
    connectionId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IReport[]; total: number }> {
    const filter = { workspaceId, connectionId };
    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Report.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },

  async findById(workspaceId: string, reportId: string): Promise<IReport | null> {
    return Report.findOne({ _id: reportId, workspaceId }).exec();
  },
};
