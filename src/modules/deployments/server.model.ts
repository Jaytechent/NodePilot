import mongoose, { Schema, Document } from 'mongoose';
import { IServer } from '../../types';

export interface IServerDocument extends Document {
  _id: any;
}

const ServerSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    projectId: { type: String, required: true, ref: 'Project' },
    name: { type: String, required: true },
    ipAddress: { type: String },
    sshPort: { type: Number, default: 22 },
    sshUser: { type: String, default: 'root' },
    sshPrivateKey: { type: String },
    provider: { type: String, enum: ['Hetzner', 'DigitalOcean', 'Contabo', 'AWS EC2'], required: true },
    region: { type: String, required: true },
    size: { type: String, required: true },
    status: { type: String, enum: ['provisioning', 'active', 'failed', 'deleted'], default: 'provisioning' },
  },
  {
    timestamps: true,
    _id: false,
  }
);

ServerSchema.virtual('id').get(function (this: any) {
  return this._id;
});

ServerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.sshPrivateKey) {
      // Hide private key by default in JSON output
      ret.sshPrivateKey = '[REDACTED]';
    }
    return ret;
  },
});

export const ServerModel = mongoose.models.Server || mongoose.model<any>('Server', ServerSchema);
