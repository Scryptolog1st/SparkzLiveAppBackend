import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateGuestMediaDto {
    @IsNotEmpty()
    @IsEnum(['audio', 'video'])
    trackType!: 'audio' | 'video'; // <-- Added '!'

    @IsBoolean()
    @IsNotEmpty()
    state!: boolean; // <-- Added '!'
}