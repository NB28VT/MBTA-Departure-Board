import React from 'react'
import { APIClient } from '../services/APIClient'
import { JsonApiDataStore } from 'jsonapi-datastore'

class DepartureBoardModel {
    constructor(routeType, stationID, pageLimit) {
        this.routeType = routeType
        this.stationID = stationID
        this.pageLimit = pageLimit

        const departureEndpoint = this._buildPredictionsEndpoint()
        this.departuresUpdateSource = new EventSource(departureEndpoint)
        this.dataStore = new JsonApiDataStore()
    }

    listenForDepartureUpdates(onResetDepartures) {
        this.departuresUpdateSource.addEventListener("reset", (event) => {
            const updatedDepartures = this._parsePredictionsUpdate(event)
            onResetDepartures(updatedDepartures)
        })
    }

    stopListeningForDepartureUpdates() {
        this.departuresUpdateSource.close()
    }

    _buildPredictionsEndpoint() {
        const base_url = "https://api-v3.mbta.com/predictions?"
        const filters = `filter[route_type]=${this.routeType}&filter[stop]=${this.stationID}`
        const limit = `&page[limit]=${this.pageLimit}`
        const include = '&include=schedule,trip'
        const api_key = `&api_key=${process.env.REACT_APP_MBTA_API_KEY}`

        return base_url + filters + limit + include + api_key
    }

    _parsePredictionsUpdate(event) {
        /**
         * Parses Event Stream updates from the MBTA Predictions endpoint. Because neither the prediction nor its related schedule
         * will always have a departure time, we filter out anything missing that data. We also filter out trips that have already
         * departed. Because we are falling back on the schedule departure time if the prediction departure time is missing, we can't
         * simply sort on departure time off of the predcitions endpoint. Instead, we manually sort the data by departure time
         * ascending once we've filtered it.
         *
         * TODO: find a better way to handle missing departure times if possible.
         */

        // We need to assign our parsed events data to an object "data" property to play nice with JsonAPIDataStore
        const serializedEvents = {data: JSON.parse(event.data)}

        // This is digusting we need a better way to handle this
        const normalizedEvents = this.dataStore.sync(serializedEvents)
        const predictions = this.dataStore.findAll('prediction')        // Might be able to combine these
        const allPredictions =  predictions.map(prediction => this._parsePrediction(prediction))

        // Yeah def combine these - use like a method just for filtering
        const withDepartureTimes = allPredictions.filter(prediction => prediction.departureTime)
        const hasNotDeparted = withDepartureTimes.filter(prediction => prediction.status !== "Departed")

        const sorted = hasNotDeparted.sort((a,b) => new Date(a.departureTime) - new Date(b.departureTime))

        return sorted.slice(0, 15)
    }

    _parsePrediction(prediction) {
        // We don't appear to have access to track number any more, although at one time it appeared as a prediction attribute -
        // "stop_id": https://www.mbta.com/developers/v3-api/changelog

        return {
            departureTime: prediction.departure_time || prediction.schedule.departure_time,
            destination: prediction.trip.headsign,
            trainNumber: prediction.trip.name || "TBD",
            trackNumber: "TBD",
            status: prediction.status || "ON TIME",
        }
    }
}


export class SouthStationDepartureBoard extends React.Component {
    constructor(props) {
        super(props)
        
        // Codes for Commuter Rail routes that stop at South Station
        const stationID = "place-sstat"
        const routeType = 2

        // For now: load more than we plan to display as we need to filter out incomplete data
        const pageLimit = 30

        this.model = new DepartureBoardModel(routeType, stationID, pageLimit)

        this.state = {
            departures: []
        }
    }

    componentDidMount = () => {
        this.model.listenForDepartureUpdates(this.onResetDepartures)
    }

    componentWillUnmount = () => {
        this.model.stopListeningForDepartureUpdates()
    }

    onResetDepartures = (departures) => {
        this.setState({departures: departures})
    } 

    render() {
        const style = {
            container: {
                backgroundImage: "linear-gradient(to top left, #000000, #333333)",
                width: '50vw',
                fontSize: "auto",
                borderRadius: 5,
            },
            headerRow: {
                color: "white",

            },
            // South station is actually more orangey
            rows: {
                color: "#EBDC2B",
                fontFamily: "Roboto Mono, monospace",

            },
            table: {
                width: "100%",
            }
        }

        const departureRows = this.state.departures.map(departure => {

            const formattedDepartureTime = new Date (departure.departureTime).toLocaleTimeString(
                [], {hour: '2-digit', minute:'2-digit'}
            )

            return (
                <tr style={style.rows}>
                    <th style={style.cell}>MBTA</th>
                    <th style={style.cell}>{formattedDepartureTime}</th>
                    <th style={style.cell}>{departure.destination}</th>
                    <th style={style.cell}>{departure.trainNumber}</th>
                    <th style={style.cell}>{departure.trackNumber}</th>
                    <th style={style.cell}>{departure.status}</th>
                </tr>
            )
        })

        return (
            <div style={style.container}>
                <table style={style.table}>
                    <thead>
                        <tr style={style.headerRow}>
                            <th>Carrier</th>
                            <th>Time</th>
                            <th>Destination</th>
                            <th>Train#</th>
                            <th>Track#</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departureRows}
                    </tbody>
                </table>
            </div>
        )
    }
}