import { IResult } from "./IResult"
import React, { useState } from "react";
import Image from "next/image";

type Props = {
    videoInfo: IResult;
}

const timestampConversion = (time:number) => {
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time % 3600) / 60);
    let seconds = time % 60;

    let formattedMinutes = minutes.toString().padStart(2, '0');
    let formattedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
        return `${formattedMinutes}:${formattedSeconds}`;
    }
}

const createMarkup = (snippet: string) => {
    // Split the string on "mark", then map over the pieces
    let markExpr= /<\/?mark>/gi
    return snippet.split(markExpr).map((part, index, array) => {
        // For every odd part, wrap it with a <b> tag, indicating it was between "mark" tags
        if (index % 2 === 1) {
            return <b key={index}>{part}</b>;
        } else {
            // For even parts, just return the text. If it's the last part, don't add anything after
            return part;
        }
    });
}

const Card = ({videoInfo}: Props) => {
    const thumbnailLink = "https://i.ytimg.com/vi/" + videoInfo.video_id + "/mqdefault.jpg";
    return (
        <div className="border rounded border-gray-500 p-2 m-2">
            <Image
                    className="relative w-auto"
                    src={thumbnailLink}
                    alt="Logo"
                    width={180}
                    height={37}
                    priority
                />
            <p className="text-xl font-bold">{videoInfo.title}</p>
            <p className="italic">{videoInfo.channel_name}</p>
            
            <div className="flex flex-col">
                {videoInfo.matches.map((result, index) => {
                    return (
                        <div key={index} className="my-3">
                            <a href={`https://youtu.be/${videoInfo.video_id}?t=${result.timestamp}`} className="font-bold text-blue-500">
                                {timestampConversion(result.timestamp)}
                            </a>
                            <span> {createMarkup(result.snippet)} </span>
                        </div>
                    );                    
                })
                }
            </div>
        </div> 
    )   
};
export default Card;