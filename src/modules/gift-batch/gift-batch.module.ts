import { Module } from "@nestjs/common";
import { GiftBatchService } from "./gift-batch.service";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [RealtimeModule],
  providers: [GiftBatchService],
  exports: [GiftBatchService],
})
export class GiftBatchModule {}