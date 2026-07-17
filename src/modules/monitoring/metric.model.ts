import mongoose, { Schema, Document } from 'mongoose';
import { IMetric } from '../../types';

export interface IMetricDocument extends Document {
  _id: any;
}

const MetricSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    deploymentId: { type: String, required: true, ref: 'Deployment' },
    cpu: { type: Number, required: true },
    ram: { type: Number, required: true },
    disk: { type: Number, required: true },
    bandwidth: { type: Number, required: true },
    peerCount: { type: Number, default: 0 },
    validatorStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
    rpcStatus: { type: String, enum: ['online', 'offline'], default: 'online' },
    rewards: { type: Number, default: 0 },
    blockHeight: { type: Number, default: 0 },
    missedBlocks: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  {
    _id: false,
  }
);

MetricSchema.virtual('id').get(function (this: any) {
  return this._id;
});

MetricSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const MetricModel = mongoose.models.Metric || mongoose.model<any>('Metric', MetricSchema);
