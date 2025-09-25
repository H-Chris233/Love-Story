import mongoose, { Schema, Document } from 'mongoose';

export interface IAnniversary extends Document {
  title: string;
  date: Date;
  reminderDays: number;
  createdAt: Date;
}

const anniversarySchema: Schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  date: {
    type: Date,
    required: [true, 'Please add a date'],
  },
  reminderDays: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 为常用查询字段添加索引
anniversarySchema.index({ date: 1 }); // 按日期查询的索引

export default mongoose.model<IAnniversary>('Anniversary', anniversarySchema);