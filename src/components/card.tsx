import { IResult } from "../utils/IResult"
import React, { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
    videoInfo: IResult;
}

// convert seconds to HH:MM:SS or MM:SS, as appropriate
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

// convert date to MM/DD/YYYY
const dateConversion = (date: number) => {
    let strDate = date.toString();
    let year = strDate.slice(0, 4);
    let month = strDate.slice(4, 6);
    let day = strDate.slice(6, 8);

    return `${month}/${day}/${year}`;
}

const createMarkup = (snippet: string) => {
    // Split the string on "mark", then map over the pieces
    let markExpr= /<\/?mark>/gi
    return snippet.split(markExpr).map((part, index, array) => {
        // For every odd part, wrap it with a <b> tag, indicating it was between "mark" tags
        if (index % 2 === 1) {
            return <b id = "modal" key={index}>{part}</b>;
        } else {
            // For even parts, just return the text. If it's the last part, don't add anything after
            return part;
        }
    });
}

const Card = ({videoInfo}: Props) => {
    const thumbnailLink =  `https://i.ytimg.com/vi/${videoInfo.video_id}/mqdefault.jpg`;
    const [modal, setModal] = useState(false);
    const [cardLoaded, setCardLoaded] = useState(false);

    function openModal() {
        setModal(true);
    }
    
    function closeModal() {
        setModal(false);
    }

    // close modal if clicked outside
    function handleOverlayClick(event: React.MouseEvent) {
        // check if clicked content belongs to modal
        const target = event.target as Element;
        if (!(target.id === "modal")) {
            closeModal();
        }
    }

    // close modal if escape pressed
    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && modal) {
            closeModal();
        }
    };

    useEffect(() => {
        setCardLoaded(true);
    }, [cardLoaded])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [modal]);

    return (        
        <div className={`flex flex-col transition-all ease-in duration-500 ${cardLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div onClick={openModal} className="relative w-80 h-80 border-2 rounded border-gray-500 p-2 m-2 transition-all ease-in-out duration-300 hover:bg-red-600 hover:text-white hover:border-red-700 hover:scale-105 cursor-pointer">
                <Image
                    className="relative w-auto"
                    src={thumbnailLink}
                    alt="Logo"
                    width={180}
                    height={37}
                    priority
                />
                <p className="absolute right-2 bottom-36 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">{timestampConversion(videoInfo.duration)}</p>
                <p className="text-xl font-bold line-clamp-2">{videoInfo.title}</p>
                <p className="italic line-clamp-1">{videoInfo.channel_name}</p>
                <p className="italic line-clamp-1">{videoInfo.matches.length} match(es) &#8226; Uploaded {dateConversion(videoInfo.upload_date)}</p>
            </div>


            <dialog onClick={handleOverlayClick} className={`fixed left-0 top-0 w-full h-full bg-black bg-opacity-50 overflow-auto z-50 backdrop-blur flex justify-center items-center transition-all ease-in-out duration-300 ${modal ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div id = "modal" className="bg-white m-auto px-8 py-4 border-8 border-red-600 rounded-lg flex flex-col flex-wrap dark:bg-black dark:text-white w-1/3">
                    <p id = "modal" className="font-bold text-2xl place-self-center">Results</p>
                    {videoInfo.matches.map((result, index) => {
                        return (
                            <div id = "modal" key={index} className="m-3">
                                <a id = "modal" href={`https://youtu.be/${videoInfo.video_id}?t=${result.timestamp}`} target="_blank" className="font-bold text-blue-500">
                                {timestampConversion(result.timestamp)}
                                </a>
                                <span id = "modal"> {createMarkup(result.snippet)} </span>
                            </div>
                        );                    
                    })}
                    <br/>
                    <button type="button" onClick={closeModal} className="bg-red-600 text-white p-2 border border-red-700 rounded-lg transition-all ease-in-out duration-100 hover:font-bold hover:ring-4 hover:ring-red-700 ">Close</button>
                </div>
            </dialog>
        </div>
    )   
};
export default Card;