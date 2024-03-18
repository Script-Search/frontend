'use client';
import { IResult, IMatches } from "./IResult";
import React, { useState } from "react";
import Card from "./card";
import QueryInput from "./query_input";

const apiLink = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);

    const backendConnect = (query: string) => {
        let channelLink = document.getElementById("link") as HTMLInputElement;

        let newLink = "";
        if(!channelLink.value) {
            newLink = apiLink + `?query=${query}`;
        } else if (!query) {
            newLink = apiLink + `?url=${channelLink.value}`;
        } else {
            newLink = apiLink + `?url=${channelLink.value}&query=${query}`;
        }

        setLoading(true);
        fetch(newLink).then(response => {
            if (!response.ok) {
                throw new Error("something broke :(");
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            setLoading(false);
            setSearchResults(data["hits"]);
        })
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="">    
                <p className="text-2xl before:content-['ScriptSearch'] before:text-red-600 before:font-bold before:"> - YouTube Transcript Search</p>
            </div>

            <div className="">
                <input type="text" id="link" placeholder="Enter a video/channel/playlist link" className="border rounded border-gray-500 p-2 my-1 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"></input>
            </div>

            <div className="justify-center">
                <QueryInput 
                    onEnterPress={backendConnect}
                    onInputChange={setQuery}
                    onInputError={setShowError}
                    />
            </div>
            <button 
                id="search" 
                onClick={() => backendConnect(query)} 
                className="flex justify-center items-center border border-gray-500 rounded py-2 my-1 w-80 transition-colors ease-in-out hover:bg-red-600 hover:text-white hover:border-red-700 space-x-2"
            >
                {loading && (
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="15 85"
                        strokeDashoffset="0"
                    ></circle>
                </svg>
                )}
                <span>{loading ? "Loading..." : "Search"}</span>
            </button>


            {showError && 
                <div className="text-red-600">
                    <p>Only up to 5 words are allowed.</p>
                </div>
            }

            <div className="flex flex-row flex-wrap justify-center items-center">
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
