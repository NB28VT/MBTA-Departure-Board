import React from 'react'
import { APIClient } from '../services/APIClient'
import { JsonApiDataStore } from 'jsonapi-datastore'

class DepartureBoardModel {
    constructor(stationCode, routeType) {
        this.stationCode = stationCode
        this.routeType = routeType

        this.apiClient = new APIClient()
        this.dataStore = new JsonApiDataStore()
    }

    async getCurrentDepartures() {
        // Need to retrieve commuter rail routes for south station first; schedule endpoint
        // cannot filter by route type
        const routeIDs = await this.getStationRouteIDs()


        const now = new Date()
        // TODO: I don't think this is going to work before 10, hours might return 2 instead of 02
        // TODO: use fields option to only get the fields you want for schedules
        const minTime = `${now.getHours()}:${now.getMinutes()}`
        const filters = `filter[stop]=${this.stationCode}&filter[route]=${routeIDs}&filter[min_time]=${minTime}`
        const include = '&include=prediction,trip,route'
        const sortAndLimit = '&sort=departure_time&page[limit]=10'
        const endpoint = 'schedules?' + filters + sortAndLimit + include

        const schedulesResponse = await this.apiClient.APIGet(endpoint)
        return this.buildDepartures(schedulesResponse)
    }

    async getStationRouteIDs() {
        // TODO: might be able to cache these in some way because they don't change, API supports 304 codes
        const endpoint = `routes?filter[type]=${this.routeType}&filter[stop]=${this.stationCode}&fields=id`
        const response = await this.apiClient.APIGet(endpoint)
        const serializedRoutes = this.dataStore.sync(response)

        return serializedRoutes.map(route => route.id).join()
    }

    buildDepartures(scheduleData) {
        const serialized = this.dataStore.sync(scheduleData)
        // TODO: not sure about how accurate destinations are 

        // This is South Station-04, I dunno if thats the track, maybe need to slice that
        // track: schedule.prediction.stop.id,
        return serialized.map(schedule => {
            const departure = {
                departureTime: new Date (schedule.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                destination: schedule.route.direction_destinations[0],
                trainNumber: schedule.trip.name,
            }

            if (!schedule.prediction) {
                const defaultPredictionData = {
                    track: "TBD",
                    status: "ON TIME",
                }
              return Object.assign(departure, defaultPredictionData)
            }

            const predictionData = {
                track: schedule.prediction.stop.id,
                status: schedule.prediction.status.toUpperCase(),
            }

            return Object.assign(departure, predictionData)
        })
    }
}

export class DepartureBoard extends React.Component {
    constructor(props) {
        super(props)
        
        // Codes for Commuter Rail routes that stop at South Station
        const stationCode = "place-sstat"
        const routeType = 2

        this.model = new DepartureBoardModel(stationCode, routeType)

        this.state = {
            departures: []
        }
    }

    async componentDidMount() {
        const departures = await this.model.getCurrentDepartures()
        this.setState({departures: departures})
    }

    render() {
        const style = {
            container: {
                "backgroundColor": "black",
                fontSize: 30,
            },
            header: {
                "color": "white",
            },
            // South station is actually more orangey
            rows: {
                "color": "#EBDC2B",
                fontFamily: "Roboto Mono, monospace",

            },
            cell: {
                padding: 10,
            }
        }

        const departureRows = this.state.departures.map(departure => {
            return (
                <tr style={style.rows}>
                    <th style={style.cell}>MBTA</th>
                    <th style={style.cell}>{departure.departureTime}</th>
                    <th style={style.cell}>{departure.destination}</th>
                    <th style={style.cell}>{departure.trainNumber}</th>
                    <th style={style.cell}>{departure.trackNumber}</th>
                    <th style={style.cell}>{departure.status}</th>
                </tr>
            )
        })

        return (
            <div style={style.container}>
                <table>
                    <thead style={style.header}>
                        <tr>
                            <th>Carrier</th>
                            <th>Time</th>
                            <th>Destination</th>
                            <th>Train#</th>
                            <th>Track#</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    {departureRows}
                </table>
            </div>
        )
    }
}