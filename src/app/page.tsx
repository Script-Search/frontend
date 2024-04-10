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
    const SLEEP_MS = 6500;
    const [error, setError] = useState("");
    const [pageLoaded, setPageLoaded] = useState(false);

    const itemsPerPage = 12;
    const pageCount = Math.ceil(searchResults.length / itemsPerPage);
    const [itemOffset, setItemOffset] = useState(0);
    const [endOffset, setEndOffset] = useState(itemsPerPage);
    const [currentItems, setCurrentItems] = useState(searchResults.slice(itemOffset, endOffset));
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        setPageLoaded(true);
    }, [pageLoaded]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

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
    const handleKeyPress = (e: KeyboardEvent) => {
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
        // replace + with " plus" to catch certain relevant edge cases
        query = query.replace(/\+/g, " plus");

        // Check if the query is a common word
        if (COMMON_WORDS.includes(query)) {
            throw "Please enter a more specific query.";
        }

        // Check if the query is too long
        if (query.split(" ").length > WORD_LIMIT) {
            throw "Please enter a query with 5 or fewer words.";
        }

        // Check if the query has too many characters
        if (query.length > CHARACTER_LIMIT) {
            throw "Character limit exceeded. Please shorten your query.";
        }

        return query;
    }

    // get URL data from API
    async function urlFetch(url: string, shouldSleep: boolean = true) {
        // get cached info, if any
        let cachedURLs = cache.getUrls();
        let urlData = {} as any;
        try {
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

                if (shouldSleep) {
                    await sleep(SLEEP_MS);
                    console.log('Wait finished!');
                }
            } else {            // if no URL change, use cached data
                urlData = cache.findResult(url);
                cache.pivot(url);
            }
        } catch (e) {
            urlData = null;
            handleError(e);
        }
        return urlData;
    }

    // search database for query, with optional URL data if applicable
    async function queryFetch(query: string, urlData: any | null) {
        try {
            let dataSend = (!urlData) ? { query: query } : urlData;
            setLoadingType("stage 2");
            // fetch search results from API
            const searchResponse = await fetch(apiLink, {
                method: "POST", 
                body: JSON.stringify(dataSend),
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (!searchResponse.ok) {
                throw "Search failed :(";
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
    
    // create, process, and cache request(s) to backend
    const backendConnect = async () => {
        handleError("");

        // get inputs from HTML
        let urlElement = document.getElementById("link") as HTMLInputElement;
        let queryElement = document.getElementById("query") as HTMLInputElement;
        let rawQuery = queryElement.value.trim().toLowerCase();
        let url = urlElement.value;
        let query: any;

        try {
            // sanitize and validate query
            query = validateQuery(rawQuery);
        } catch (e) {
            handleError(e);
            return;
        }
        
        // if no URL given, search entire database
        if (!url && query) {
            queryFetch(query, null);
        }

        // if URL given, search just that channel/playlist/video
        else if (url && query) {
            let urlData = await urlFetch(url) as any;
            if (urlData) {
                urlData["query"] = query;          // add query to URL data
                queryFetch(query, urlData);
            }
        }

        // if only URL given, ingest transcripts into database
        else if (url && !query) {
            let temp = await urlFetch(url, false) as any;
            if (temp)
                handleError("The video(s) in your URL have been populated into the database.");
        }

        // no query given, so nothing to be done
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
                    placeholder="Enter a video/channel/playlist link" 
                    className="border rounded border-gray-500 p-2 my-1 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
            </div>

            <div className="justify-center">
                <input 
                    type="text" 
                    id="query"
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
                <li className="ml-5">To search a specific channel or playlist for a certain phrase, give us the link of the channel/playlist in question in the first box, then enter your query in the second box.</li>
                <li className="ml-5">To search our entire database for a certain phrase, just enter your search query.</li>
                <li className="ml-5">When the search is complete, you can click on any of the resulting videos to see all transcript matches and a corresponding timestamped link.</li>
                <br></br>
                <b className="text-red-600">There are a number of restrictions that must be considered to get the most out of our application:</b>
                <li className="ml-5">Our search ignores case, and queries are matched <em>exactly</em> with portions of the transcript.</li>
                <li className="ml-5">When providing a channel or playlist link, it must be a direct YouTube link (i.e. &apos;youtube.com&apos; or &apos;youtu.be&apos;, NOT tinyurls or shortened links).</li>
                <li className="ml-5">We only search the 250 most recent videos in the link provided, and our search will return at most 250 results.</li>
                <li className="ml-5">Only English language transcripts are searched by our application.</li>
                <li className="ml-5">Queries must be 5 words or less and shorter than 75 characters.</li>
                <li className="ml-5">Searching common words such as &apos;the&apos; or &apos;a&apos; is not allowed.</li>
                </ul>
            </div>

        </main>
    );
}
