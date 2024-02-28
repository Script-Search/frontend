'use client';
import { IResult, IMatches } from "./IResult";
import React, { useState } from "react";
import Card from "./card";

const apiLink = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);

    const backendConnect = () => {
        let query = document.getElementById("query") as HTMLInputElement;
        let channelLink = document.getElementById("link") as HTMLInputElement;

        let newLink = "";
        if(!channelLink.value) {
            newLink = apiLink + "?query=" + query.value;
        } else if (!query.value) {
            newLink = apiLink + "?url=" + channelLink.value;
        } else {
            newLink = apiLink + "?url=" + channelLink.value + "&query=" + query.value;
        }

        fetch(newLink).then(response => {
            if (!response.ok) {
                throw new Error("something broke :(");
            }
            return response.json();
        })
            .then(data => {
                console.log(data);
                setSearchResults(data["hits"]);
            })
    }

    const handleEnter = (e: { key: string; }) => {
        if (e.key === 'Enter') {
            backendConnect(); 
        }
    }

    const dummyResult: IResult = {
        video_id: "video_id",
        title: "title",
        channel_id: "channel_id",
        channel_name: "channel_name",
        matches: [{snippet:"test", timestamp:3661}]
    }
    const dummyResult2: IResult = {
        video_id: "video_id2",
        title: "title2",
        channel_id: "channel_id2",
        channel_name: "channel_name2",
        matches: [{snippet:"test2", timestamp:65}]
    }
    if(searchResults.length == 0){
        searchResults.push(dummyResult);
    }
    if(searchResults.length == 1){
        searchResults.push(dummyResult2);
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            {/* <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-full sm:before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full sm:after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]"> */}
            <div className="">    
                <p className="text-2xl before:content-['ScriptSearch'] before:text-red-500 before:font-bold before:"> - YouTube Transcript Search</p>
            </div>

            <div className="">
                <input type="text" id="link" placeholder="Enter a channel/playlist link" className="border rounded border-gray-500 p-2 my-1 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"></input>
            </div>

            <div className="justify-center">
                <input type="text" id="query" placeholder="Enter a query" onKeyUp={handleEnter} className="border rounded border-gray-500 p-2 w-64 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"></input>
                <button id="search" onClick={backendConnect} className="border border-gray-500 rounded py-2  w-16 transition-colors ease-in-out hover:bg-red-600 hover:text-white hover:border-red-700">Submit</button>
            </div>

            <div className="flex flex-row">
                {searchResults.map((result, index) => {
                    return(
                        
                            <Card videoInfo={result} key={index}></Card>
                    )
                })
                }
            </div>
        </main>
    );
}
