import { Hono } from 'https://deno.land/x/hono/mod.ts'
import { DateTime } from 'https://esm.sh/luxon?target=deno'
import "https://deno.land/std@0.208.0/dotenv/load.ts"

const kv = await Deno.openKv()
const app = new Hono()

app.get('/', (c)=>c.json({"message": "go to /api/weather and use the docs at https://openweathermap.org/current"}))

app.get('/api/weather', async (c) => {
	let lat = c.req.query('lat')
  let lon = c.req.query('lon')
	let city = c.req.query('q') || null
	// Use either lat+lon or city
	let query = lat && lon? lat+lon:city
	// Cancel query if non present
	if (query == null) {
		c.status = 401
		return c.json({
			cod: 401,
			message: "No query location provided. Reffer to docs at https://openweathermap.org/current"
		})
	}

	let units = c.req.query('units') || 'metric'
	let appid = c.req.query('appid') || null
	// Checks for password
	if (appid.startsWith("!") && appid == "!" + Deno.env.get('PASS')) {
		appid = Deno.env.get('OPENWEATHER_API_KEY')
	} else if (appid == null) {
		// If no appid ask to provide one
		c.status = 401
		return c.json({
			cod: 401,
			message: "No valid appid. Please provide your Open Weather Maps api key."
		})
	}
	// Check if exists
	let get = await kv.get([query])
	let out = {}
	if (get.value == null || get.value.expiry <=Number(DateTime.now().toFormat("X"))) {
		// Request api
		out = await getWeather(lat, lon, city, units, appid)
		if (out.cod != 200) {
			c.status = out.cod
			return c.json
		}
		// Put in database
		let expiry = Number(DateTime.now().plus({hours: 1}).minus({minutes: DateTime.now().minute, seconds: DateTime.now().second}).toFormat("X"))
		let saving = Object.assign({}, out)
		saving.expiry = expiry
		await kv.set([query], saving, {expiry})
		//db.put(out, query, {expireAt: expiry})
	} else {
		// if does, set response to it
		delete get.value.expiry
		out = get.value
	}
	// response
	return c.json(out)
})

async function getWeather(lat, lon, city, units, appid) {
	let response
	let out
	if (lat && lon) {
		response = await fetch(`http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${appid}`)
	} else {
		response = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${appid}`)
	}
	// OK
	if (await response.status == 200) {
		out = await response.json()
	} else if (await response.status == 401) {
		// Openweather throws error
		c.status = 401
		return await response.json()
	} else {
		// Unknown error
		c.status = await response.status
		return {
			cod: await response.status,
			message: `unknown error: ${await response.text()}`
		}
	}
	return out
}

export default app