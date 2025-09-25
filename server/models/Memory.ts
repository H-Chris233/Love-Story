import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IImage {
  url: string;
  publicId: string;
}

export interface IMemory extends Document {
  title: string;
  description: string;
  date: Date;
  images: IImage[];
  user: IUser['_id'];
  createdAt: Date;
}

const memorySchema: Schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  date: {
    type: Date,
    required: [true, 'Please add a date'],
  },
  images: [
    {
      url: String,
      publicId: String,
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 为常用查询字段添加索引
memorySchema.index({ user: 1, date: -1 }); // 按用户和日期排序的复合索引
memorySchema.index({ createdAt: -1 }); // 按创建时间排序的索引
memorySchema.index({ date: -1 }); // 按日期排序的索引

export default mongoose.model<IMemory>('Memory', memorySchema);