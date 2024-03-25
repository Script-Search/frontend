'use client';
import { IResult, IMatches } from "./IResult";
import React, { useState } from "react";
import ReactPaginate from 'react-paginate';
import Card from "./card";
import QueryInput from "./query_input";
import Image from 'next/image';
import logo from '../../public/ScriptSearch_New_Logo.png';

const apiLink = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [hasError, setHasError] = useState("");

    const itemsPerPage = 5;
    const pageCount = Math.ceil(searchResults.length / itemsPerPage);
    const [itemOffset, setItemOffset] = useState(0);
    const [endOffset, setEndOffset] = useState(itemsPerPage);
    const [currentItems, setCurrentItems] = useState(searchResults.slice(itemOffset, endOffset));
    const [currentPage, setCurrentPage] = useState(0);

    const handleError = (error:any) => {
        setLoading(false);
        setHasError(error);
        setSearchResults([]);
    }

    function sleep(ms:number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const backendConnect = (query: string) => {
        let url = document.getElementById("link") as HTMLInputElement;

        setLoading(true);

        // if no URL given, search entire database just as before
        if (!url.value) {
            fetch(apiLink + `?query=${query}`).then(response => {
                try{
                    if (!response.ok) {
                        throw "something broke :(";
                    }
                    return response.json();
                }
                catch(e){
                    handleError(e);
                }
            })
            .then(data => {
                console.log(data);
                setLoading(false);
                if(data["hits"].length == 0){
                    setHasError("No results")
                }
                else{
                    setHasError("");
                }
                setSearchResults(data["hits"]);

                setCurrentPage(0);
                setItemOffset(0);
                setEndOffset(itemsPerPage);
                setCurrentItems(data["hits"].slice(0, itemsPerPage));
            })
        }
        
        // if URL given, search just that channel/playlist/video
        else if (url.value && query) {
            fetch(apiLink + `?url=${url.value}`).then(response => {
                try{
                    let r = response.json();
                    console.log("First response: " + r);
                    if (!response.ok) {
                        throw "Incorrect URL, please try again.";
                    }
                    return r;         // get channel_id and video_id information from API
                }
                catch(e){
                    handleError(e);
                    throw e;
                }
            })
            .then(data => { 
                console.log("Stringified data: " + JSON.stringify(data));
                sleep(12000).then(() => { console.log('Wait finished!'); }).then(() => {
                    // pass back to API to perform search
                    fetch(apiLink + `?query=${query}`, {
                        method: "POST", 
                        body: JSON.stringify(data),
                        headers: {
                            "Content-Type": "application/json",
                        }})
                        .then(response => {
                            try{
                                let r = response.json();
                                console.log("Second response: " + r);
                                if (!response.ok) {
                                    throw "Couldn't search API";
                                }
                                return r;
                            }
                            catch(e){
                                handleError(e);
                                throw e;
                            }
                    })
                    .then(data => {
                        console.log("Search results: " + data);
                        setLoading(false);
                        if(data["hits"].length == 0){
                            setHasError("No results")
                        }
                        else{
                            setHasError("");
                        }
                        setSearchResults(data["hits"])
                        
                        setCurrentPage(0);
                        setItemOffset(0);
                        setEndOffset(itemsPerPage);
                        setCurrentItems(data["hits"].slice(0, itemsPerPage));
                    });
                })
            })
        }

        else{
            try{
                throw "Please enter a query."
            }
            catch(e){
                handleError(e);
            }
        }
        
    }

    function Items({ currentItems } : {currentItems:IResult[]}) {
        return (
            <>
            {currentItems.map((result, index) => {
                return(
                    <Card videoInfo={result} key={index}></Card>
                );
            })
          }
          </>
        )
    }
    
    const handlePageClick = (event:any) => {
        const newOffset = (event.selected * itemsPerPage) % searchResults.length;

        setCurrentPage(event.selected);
        setItemOffset(newOffset);
        setEndOffset(newOffset + itemsPerPage);
        setCurrentItems(searchResults.slice(newOffset, newOffset + itemsPerPage));
    };
    
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div>
                <Image
                        className="relative invert dark:invert-0 w-64 mb-2"
                        src={logo}
                        alt="Logo"
                        width={385}
                        height={385}
                        priority
                    />
            </div>

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

            {hasError.length != 0 &&
            <div>
                <p className="text-2xl font-bold my-10">{hasError}</p>
            </div>
            }

            {searchResults.length != 0 && 
            <>
                <div className="flex flex-row flex-wrap justify-center items-center py-4">
                    <Items currentItems={currentItems} />
                </div>
            
                <div>
                    <ReactPaginate
                    breakLabel="..."
                    nextLabel=">"
                    forcePage={currentPage}
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={5}
                    marginPagesDisplayed={2}
                    pageCount={pageCount}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    className="flex flex-row mt-4 bg-gray-300 p-5 rounded fixed bottom-0 left-0 w-screen justify-center bg-opacity-90 dark:invert"
                    pageClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    previousClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    nextClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    breakClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    pageLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded text-red-700 bg-white dark:invert"
                    previousLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded bg-red-600 text-white dark:invert"
                    nextLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded bg-red-600 text-white dark:invert"
                    breakLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded text-red-700 bg-white dark:invert"
                    activeLinkClassName="[&&]:bg-red-600 [&&]:text-white font-bold"
                    />
                </div>
            </>
            }
        </main>
    );
}
