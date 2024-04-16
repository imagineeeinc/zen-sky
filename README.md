# Zen Sky
A simple open weather map API wrapper which provides caching, to reduce your api request.

## Deploying
Make sure the [Deno runtime](https://deno.com/) is installed on your system.

Then simply run `deno task start` or `deno run --allow-read --allow-net --allow-env --unstable src/deno.js`

To customize the port set `PORT` variable to the port.

This project has been designed with deno deploy in mind and deploying to other serverless platforms maybe not be possible as it relys on deno kv.

## Usage
Just like the normal opan weather api call `/api/weather` with query `lat` & `lon` or `q` for city. Optional `units`, reffer to open weather docs as to what is exepted, default is `metric`.

Also you have to pass in your open weather api key in `appid` (Note: the api key is not saved and is only used to accsess the open weather api)

Once a query is made it is stored for 1 hour in a cache for the coresponding lat+lon or city.
