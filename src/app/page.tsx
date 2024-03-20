'use client';
import { IResult, IMatches } from "./IResult";
import React, { useState } from "react";
import ReactPaginate from 'react-paginate';
import Card from "./card";
import QueryInput from "./query_input";
import Image from 'next/image';
import logo from '../../public/ScriptSearch_Logo.png';

const apiLink = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [itemOffset, setItemOffset] = useState(0);

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

    function Items({ currentItems }) {
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
    
    function PaginatedItems({itemsPerPage}) {
        // Here we use item offsets; we could also use page offsets
        // following the API or data you're working with.
        const [itemOffset, setItemOffset] = useState(0);
      
        // Simulate fetching items from another resources.
        // (This could be items from props; or items loaded in a local state
        // from an API endpoint with useEffect and useState)
        const endOffset = itemOffset + itemsPerPage;
        const currentItems = searchResults.slice(itemOffset, endOffset);
        const pageCount = Math.ceil(searchResults.length / itemsPerPage);
      
        // Invoke when user click to request another page.
        const handlePageClick = (event) => {
          const newOffset = (event.selected * itemsPerPage) % searchResults.length;
          console.log(
            `User requested page number ${event.selected}, which is offset ${newOffset}`
          );
          setItemOffset(newOffset);
        };
      
        return (
            <>
            <Items currentItems={currentItems} />
          <div>
            <ReactPaginate
              breakLabel="..."
              nextLabel=">"
              onPageChange={handlePageClick}
              pageRangeDisplayed={5}
              marginPagesDisplayed={2}
              pageCount={pageCount}
              previousLabel="<"
              renderOnZeroPageCount={null}
              className="flex flex-row"
              pageLinkClassName="px-2 mx-1 border-2 border-red-700 rounded"
              previousLinkClassName="px-2"
              nextLinkClassName="px-2"
              activeLinkClassName="bg-red-600 text-white font-bold"
            />
          </div>
          </>
        );
      }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div>
                <Image
                        className="relative"
                        src={logo}
                        alt="Logo"
                        width={180}
                        height={37}
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

            {searchResults.length != 0 && <div className="flex flex-col flex-wrap justify-center items-center">
                 <PaginatedItems itemsPerPage={4} />
            </div>}
        </main>
    );
}
