import { IResult } from "./IResult"
import React, { useState } from "react";

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

const Card = ({videoInfo}: Props) => {
    return (
        <div className="border rounded border-gray-500 p-2 m-2">
            <p>Thumbnail</p>
            <p className="text-xl font-bold">{videoInfo.title}</p>
            <p className="italic">{videoInfo.channel_name}</p>

            <div className="flex flex-row">
                {videoInfo.matches.map((result, index) => {
                    return(
                        <p key={index}>{timestampConversion(result.timestamp) + " " + result.snippet}</p>
                    )
                })
                }
            </div>
        </div> 
    )   
};
export default Card;