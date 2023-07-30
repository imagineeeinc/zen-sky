import { Hono } from 'hono'
import { Deta } from 'deta'
import fetch from 'node-fetch'
import { DateTime } from 'luxon'
import * as dotenv from 'dotenv'
dotenv.config()

const deta = Deta();
const db = deta.Base('zen-sky')
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
	if (appid.startsWith("!") && appid == "!" + process.env.PASS) {
		appid = process.env.OPENWEATHER_API_KEY
	} else if (appid == null) {
		// If no appid ask to provide one
		c.status = 401
		return c.json({
			cod: 401,
			message: "No valid appid. Please provide your Open Weather Maps api key."
		})
	}
	// Check if exists
	let get = await db.get(query)
	let out = {}
	if (get == null) {
		// Request api
		let response
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
			return c.json(await response.json())
		} else {
			// Unknown error
			c.status = await response.status
			return c.json({
				cod: await response.status,
				message: `unknown error: ${await response.text()}`
			})
		}
		// Put in database
		let expiry = Number(DateTime.now().plus({hours: 1}).minus({minutes: DateTime.now().minute, seconds: DateTime.now().second}).toFormat("X"))
		db.put(out, query, {expireAt: expiry})
	} else {
		// if does, set response to it
		delete get.__expires
		delete get.key
		out = get
	}
	// response
	return c.json(out)
})
export default app