export interface IMatches {
    snippet: string;
    timestamp: number;
}

export interface IResult {
    video_id: string;
    title: string;
    channel_id: string;
    channel_name: string;
    matches: IMatches[];
}