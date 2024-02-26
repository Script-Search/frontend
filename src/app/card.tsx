import { IResult } from "./IResult"
import React, { useState } from "react";

type Props = {
    videoInfo: IResult;
}

const timestampConversion = (time:number) => {
    if(time > 3600){
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) / 60);
        let seconds = time % 60;

        if(minutes >= 10 && seconds >= 10){
            return hours + ":" + minutes + ":" + seconds;
        }
        else if(minutes < 10 && seconds >= 10){
            return hours + ":0" + minutes + ":" + seconds;
        }
        else if(minutes >= 10 && seconds < 10){
            return hours + ":" + minutes + ":0" + seconds;
        }
        else{
            return hours + ":0" + minutes + ":0" + seconds;
        }

    }
    else{
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;

        if(minutes >= 10 && seconds >= 10){
            return minutes + ":" + seconds;
        }
        else if(minutes < 10 && seconds >= 10){
            return "0" + minutes + ":" + seconds;
        }
        else if(minutes >= 10 && seconds < 10){
            return minutes + ":0" + seconds;
        }
        else{
            return "0" + minutes + ":0" + seconds;
        }
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
                        <p>{timestampConversion(result.timestamp) + " " + result.snippet}</p>
                    )
                })
                }
            </div>
        </div> 
    )   
};
export default Card;