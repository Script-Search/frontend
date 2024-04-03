'use client';
import { useEffect } from "react";
import Image from 'next/image';
import React, { useState } from "react";
import ReactPaginate from 'react-paginate';
import { COMMON_WORDS, SPECIAL_CHARS, WORD_LIMIT, CHARACTER_LIMIT } from "../utils/validation";
import Card from "../components/card";
import InMemoryCache from "../components/cache";
import { IResult } from "../utils/IResult";
import logo from '../../public/ScriptSearch_New_Logo.png';

const apiLink = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"
const CACHE_SIZE: number = 5;
const cache = new InMemoryCache(CACHE_SIZE);

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);
    const [loadingType, setLoadingType] = useState("");
    const [error, setError] = useState("");
    const [pageLoaded, setPageLoaded] = useState(false);

    const itemsPerPage = 10;
    const pageCount = Math.ceil(searchResults.length / itemsPerPage);
    const [itemOffset, setItemOffset] = useState(0);
    const [endOffset, setEndOffset] = useState(itemsPerPage);
    const [currentItems, setCurrentItems] = useState(searchResults.slice(itemOffset, endOffset));
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        setPageLoaded(true);
    }, [pageLoaded])

    // generic function to handle errors
    const handleError = (error: any) => {
        // clears results, removes loading icon, and displays error message
        setLoadingType("");
        setError(error);
        setSearchResults([]);
    }

    // wait function
    function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // make backend request when 'enter' is pressed
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && loadingType.length === 0) {
            backendConnect();
        }
    };

    // set loading text on button depending on stage of search
    const loadingText = () => {
        if (loadingType === "stage 1") {
            return "Populating Database...";
        }
        else if (loadingType === "stage 2") {
            return "Searching Database...";
        }
        return "Search";            // default button text
    };

    // basic steps to be performed on hits returned from search
    function handleHits(data: { hits: IResult[] }) {
        setLoadingType("");         // clear loading icon
        if (!data || !data["hits"])
            throw "Hits data was null";
        setError((data["hits"].length === 0) ? "No results found." : "");       // inform user of empty results
        setSearchResults(data["hits"]);         // populate results onto page
    }

    // initial steps to paginate search results
    function initPaginate(data: { hits: IResult[] }) {
        setCurrentPage(0);
        setItemOffset(0);
        setEndOffset(itemsPerPage);
        setCurrentItems(data["hits"].slice(0, itemsPerPage));
    }

    function validateQuery(query: string) {
        // drop punctuation from query (breaks search)
        const regex = new RegExp(`[${SPECIAL_CHARS.join('\\')}]`, 'g');
        query = query.replace(regex, '');

        // Check if the query is a common word
        if (COMMON_WORDS.includes(query)) {
            handleError("Please enter a more specific query.");
            return;
        }

        // Check if the query is too long
        if (query.split(" ").length > WORD_LIMIT) {
            handleError("Please enter a query with 5 or fewer words.");
            return;
        }

        // Check if the query has too many characters
        if (query.length > CHARACTER_LIMIT) {
            handleError("Character limit exceeded. Please shorten your query.");
            return;
        }

        return query;
    }

    // create, process, and cache request(s) to backend
    const backendConnect = async () => {
        setSearchResults([]);

        // get inputs from HTML
        let urlElement = document.getElementById("link") as HTMLInputElement;
        let queryElement = document.getElementById("query") as HTMLInputElement;
        let tempQuery = queryElement.value.trim().toLowerCase();
        let url = urlElement.value;

        // sanitize and validate query
        let query = validateQuery(tempQuery);

        // get cached info, if any
        let cachedURLs = cache.getUrls();
        
        // if no URL given, search entire database
        if (!url && query) {
            try {
                setLoadingType("stage 2");
                // fetch search results from API
                const searchResponse = await fetch(apiLink, {
                    method: "POST", 
                    body: JSON.stringify({ query: query }),
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (!searchResponse.ok) {
                    throw "something broke :(";
                }
                const searchData = await searchResponse.json();
                // console.log(data);

                // display and paginate results
                handleHits(searchData);
                initPaginate(searchData);
            } catch (e) {
                handleError(e);
            }
        }

        // if URL given, search just that channel/playlist/video
        else if (url && query) {
            try {
                let urlData = {} as any;
                if (!cachedURLs || !cachedURLs.includes(url)) {    // only query API if URL has changed
                    setLoadingType("stage 1");
                    // fetch URL data from API
                    const urlResponse = await fetch(apiLink, {
                        method: "POST", 
                        body: JSON.stringify({ url: url }),
                        headers: {
                            "Content-Type": "application/json",
                        }
                    });
                    if (!urlResponse.ok) {
                        throw "Incorrect URL, please try again.";
                    }
                    urlData = await urlResponse.json();
                    // console.log("First response: " + JSON.stringify(urlData));
                    cache.push(url, urlData);

                    await sleep(10000);
                    console.log('Wait finished!');
                } else {            // if no URL change, use cached data
                    urlData = cache.findResult(url);
                    cache.pivot(url);
                }
                
                setLoadingType("stage 2");
                urlData["query"] = query;          // add query to URL data
                // fetch search results from API
                const searchResponse = await fetch(apiLink, {
                    method: "POST", 
                    body: JSON.stringify(urlData),
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (!searchResponse.ok) {
                    throw "Couldn't search API";
                }
                const searchData = await searchResponse.json();
                // console.log("Second response: " + JSON.stringify(searchData));

                // display and paginate results
                handleHits(searchData)
                initPaginate(searchData);
            } catch (e) {
                handleError(e);
            }
        }

        else {
            handleError("Please enter a query.");
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

        setPageLoaded(false);
        setCurrentPage(event.selected);
        setItemOffset(newOffset);
        setEndOffset(newOffset + itemsPerPage);
        setCurrentItems(searchResults.slice(newOffset, newOffset + itemsPerPage));
    };
    
    return (
        <main className={`flex min-h-screen flex-col items-center justify-center pt-10 pb-24 transition-all ease-in duration-700 ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>
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
                <input 
                    type="text" 
                    id="link"
                    onKeyUp={handleKeyPress}
                    placeholder="Enter a video/channel/playlist link" 
                    className="border rounded border-gray-500 p-2 my-1 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
            </div>

            <div className="justify-center">
                <input 
                    type="text" 
                    id="query"
                    onKeyUp={handleKeyPress}
                    placeholder="Enter a query"
                    className="border rounded border-gray-500 p-2 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
            </div>

            <button 
                id="search" 
                onClick={() => backendConnect()} 
                className="flex justify-center items-center border border-gray-500 rounded py-2 my-1 w-80 transition-colors ease-in-out hover:bg-red-600 hover:text-white hover:border-red-700 space-x-2"
                disabled={loadingType.length > 0}
            >
                {loadingType.length > 0 && (
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
                <span>{loadingText()}</span>
            </button>

            {error.length != 0 &&
            <div>
                <p className="text-2xl font-bold my-10">{error}</p>
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
                    pageRangeDisplayed={3}
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
            
            <div className="w-11/12 my-5">
                <ul className="marker:text-red-600 list-disc list-inside p-2 bg-gray-300 border-2 rounded-lg border-gray-700 dark:bg-gray-800 dark:border-white-700 dark:text-white">
                <b className="text-red-600">Welcome to ScriptSearch! This tool will allow you to search the transcripts of a specified YouTube channel or playlist.</b>
                <li className="ml-5">To search a specific channel or playlist for a certain keyword, type the link of the channel/playlist in question in the first box, type the query in the second box, and click the search button or press the enter key</li>
                <li className="ml-5">To search our entire database for a certain keyword, perform the above procedure but leave the first box blank</li>
                <li className="ml-5">Once the search is complete, you can click on any of the videos to see a list of all timestamps where that word appears in the transcript of that video accompanied by a timestamped YouTube link that takes you directly to the point at which the word is said</li>
                <br></br>
                <b className="text-red-600">There are a number of restrictions that must be considered to get the most out of our application:</b>
                <li className="ml-5">Our application only searches for exact matches of the query searched for (i.e. searching &apos;script&apos; will not result in &apos;scriptsearch&apos;)</li>
                <li className="ml-5">Only the most recent 250 videos of the specified channel/playlist will be searched and returned</li>
                <li className="ml-5">Only English language transcripts are searched by our application</li>
                <li className="ml-5">Queries must be limited to  5 words or less and shorter than 75 characters</li>
                <li className="ml-5">Searching with special characters (!, @, *, etc.) is allowed, but discouraged, as it may result in unexpected searching behavior</li>
                <li className="ml-5">Searching common words such as &apos;the&apos; or &apos;a&apos; is not allowed</li>
                </ul>
            </div>

        </main>
    );
}
