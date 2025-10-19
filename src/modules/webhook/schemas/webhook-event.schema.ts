import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'webhook_events' })
export class WebhookEvent {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true, index: true })
  externalApplicantId: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, any>;

  @Prop({
    type: {
      processed: { type: Boolean, default: false },
      processedAt: { type: Date },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date },
      error: {
        type: {
          message: { type: String },
          stack: { type: String },
          code: { type: String },
        },
      },
    },
    default: { processed: false, attempts: 0 },
  })
  processing: {
    processed: boolean;
    processedAt?: Date;
    attempts: number;
    lastAttemptAt?: Date;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };

  @Prop({ required: true, default: Date.now })
  receivedAt: Date;
}

export type WebhookEventDocument = WebhookEvent & Document;
export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);

// Additional indexes
WebhookEventSchema.index({ 'processing.processed': 1 });
WebhookEventSchema.index({ receivedAt: -1 });

// TTL index - auto-delete events after 30 days
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
