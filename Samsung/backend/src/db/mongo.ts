import mongoose from 'mongoose';

export async function connectMongo(mongoUri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
}

