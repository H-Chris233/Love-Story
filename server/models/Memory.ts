import mongoose, { Schema, Document, Types } from 'mongoose';
import { IUser } from './User';

export interface IImage {
  url: string;
  publicId: string;
}

export interface IMemory extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  images: IImage[];
  user: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IMemory>('Memory', memorySchema);