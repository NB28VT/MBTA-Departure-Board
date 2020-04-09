import React from 'react'
import { JsonApiDataStore } from 'jsonapi-datastore'

function formatTimeHHMM(date) {
    return new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

class DepartureBoardModel {
    constructor(routeType, stationID, pageLimit) {
        this.routeType = routeType
        this.stationID = stationID
        this.pageLimit = pageLimit

        const predictionsEndpoint = this._buildPredictionsEndpoint()
        this.departuresUpdateSource = new EventSource(predictionsEndpoint)
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
        const queryParams = {
            "filter[route_type]": this.routeType,
            "filter[stop]": this.stationID,
            "page[limit]": this.pageLimit,
            "include": 'schedule,trip',
            "api_key": process.env.REACT_APP_MBTA_API_KEY,
        }

        return "https://api-v3.mbta.com/predictions?" + new URLSearchParams(queryParams).toString()
    }

    _parsePredictionsUpdate(event) {
        /**
         * Parses Event Stream updates from the MBTA Predictions endpoint. Because neither the prediction nor its related schedule
         * will always have a departure time, we filter out anything missing that data. We also filter out trips that have already
         * departed. Because we are falling back on the schedule departure time if the prediction departure time is missing, we can't
         * simply pass a sort param to the predictions endpoint. Instead, we manually sort the data by departure time ascending once 
         * we've filtered it.
         *
         * TODO: find a better way to handle missing departure times if possible.
         */

        // We need to assign our parsed events data to an object "data" property to play nice with JsonAPIDataStore
        this.dataStore.sync({data: JSON.parse(event.data)})

        const parsedPredictions = this.dataStore.findAll('prediction').map(prediction => this._parsePrediction(prediction))
        const filteredPredictions = parsedPredictions.filter((prediction) => {
            return (prediction.departureTime) && (prediction.status !== "Departed")
        })
        const sorted = filteredPredictions.sort((a,b) =>  new Date(a.departureTime) - new Date(b.departureTime))

        return sorted.slice(0, 10)
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

class DepartureBoardHeader extends React.Component {
    constructor(props) {
        super(props)

        this.state = {time: new Date()}
    }

    componentDidMount = () => {
        this.timeCheck = setInterval(() =>  this._checkTime(), 1000)
    }

    componentWillUnmount = () => {
        clearInterval(this.timeCheck)
    }

    _checkTime = () => {
        this.setState({time: new Date()})
    }

    render() {
        const styles = {
            container: {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                margin: "5px 10px 0px 10px",
                height: '6vh',
                color: "#FFB400",
                fontWeight: 500,
            },
            title: {
                color: "white",
            },
        }

        const dayOfWeek = this.state.time.toLocaleString('en-us', {weekday: 'long'}).toUpperCase()
        const date = this.state.time.toLocaleDateString()
        const clockTime = formatTimeHHMM(this.state.time)

        return (
            <div style={styles.container}>
                <div>
                    <div>{dayOfWeek}</div>
                    <div>{date}</div>
                </div>
                <div style={styles.title}>
                    SOUTH STATION TRAIN INFORMATION
                </div>
                <div>
                    <div>CURRENT TIME</div>
                    <div>{clockTime}</div>
                </div>
            </div>
        )
    }
}

function DepartureTableRow(props) {
    const style = {
        color: "#FFB400",
        textAlign: "left",
    }

    const departure = props.departure
    const departureTime = formatTimeHHMM(departure.departureTime)

    return (
        <tr style={style}>
            <th>MBTA</th>
            <th>{departureTime}</th>
            <th>{departure.destination.toUpperCase()}</th>
            <th>{departure.trainNumber.toUpperCase()}</th>
            <th>{departure.trackNumber.toUpperCase()}</th>
            <th>{departure.status.toUpperCase()}</th>
        </tr>
    )
}

export class SouthStationDepartureBoard extends React.Component {
    constructor(props) {
        super(props)

        // Codes for Commuter Rail routes that stop at South Station
        const routeType = 2
        const stationID = "place-sstat"
        // For now: load more than we plan to display as we need to filter out incomplete data
        const pageLimit = 30

        this.model = new DepartureBoardModel(routeType, stationID, pageLimit)
        this.state = {departures: []}
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
                width: '65vw',
                height: '45vh',
                fontFamily: "Roboto Mono, monospace",
                borderRadius: 5,
                overflow: 'hidden',
            },
            departuresHeader: {
                color: "white",
                fontSize: "80%",
                textAlign: 'center',
            },
            table: {
                width: "100%",
                margin: 5,
            }
        }

        const departuresHeader = (
            <thead>
                <tr style={style.departuresHeader}>
                    <th>CARRIER</th>
                    <th>TIME</th>
                    <th>DESTINATION</th>
                    <th>TRAIN#</th>
                    <th>TRACK#</th>
                    <th>STATUS</th>
                </tr>
            </thead>
        )

        const departureRows = this.state.departures.map(departure => <DepartureTableRow departure={departure}/>)

        return (
            <div style={style.container}>
                <DepartureBoardHeader/>
                <table style={style.table}>
                    {departuresHeader}
                    <tbody>
                        {departureRows}
                    </tbody>
                </table>
            </div>
        )
    }
}
