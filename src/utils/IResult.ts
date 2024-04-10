interface IMatches {
    snippet: string;
    timestamp: number;
}

export interface IResult {
    video_id: string;
    title: string;
    channel_id: string;
    channel_name: string;
    upload_date: number;
    duration: number;
    matches: IMatches[];
}