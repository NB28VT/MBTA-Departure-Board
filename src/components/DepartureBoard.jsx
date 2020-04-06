import React from 'react'
import { APIClient } from '../services/APIClient'
import { JsonApiDataStore } from 'jsonapi-datastore'

// For use with streaming off of EventSource
// Could use mobx here to track the state of the departures, might be easier than passing onReset callback function
class DepartureBoardModel {
    constructor(routeType, stationID, pageLimit) {
        this.routeType = routeType
        this.stationID = stationID
        this.pageLimit = pageLimit

        const departureEndpoint = this._buildPredictionsEndpoint()
        console.log("Departure endpoint", departureEndpoint)
        this.departuresUpdateSource = new EventSource(departureEndpoint)
        this.dataStore = new JsonApiDataStore()
    }

    listenForDepartureUpdates(onResetDepartures) {
        this.departuresUpdateSource.addEventListener("reset", (event) => {
            console.log(event)
            const updatedDepartures = this._parsePredictionsUpdate(event)
            onResetDepartures(updatedDepartures)
        })
    }

    // Or whatever better name... call in component will unmount
    stopListeningForDepartureUpdates() {
        this.departuresUpdateSource.close()
    }

    _buildPredictionsEndpoint() {
        // FUCK WE CAN'T GET MAX TIME FUCK FUCK FUCK FUCK FUCK 

        // BUT IF WE SORT WE CAN PROBABLY GET IT
        const base_url = "https://api-v3.mbta.com/predictions?"
        const filters = `filter[route_type]=${this.routeType}&filter[stop]=${this.stationID}`
        const limit = `&page[limit]=${this.pageLimit}`
        const include = '&include=schedule,trip,route'
        const api_key = `&api_key=${process.env.REACT_APP_MBTA_API_KEY}`

        return base_url + filters + limit + include + api_key
    }

    _parsePredictionsUpdate(event) {
        // Need to assign our parsed events data to an object "data" property to play nice with JsonAPIDataStore
        const serializedEvents = {data: JSON.parse(event.data)}
        const normalizedEvents = this.dataStore.sync(serializedEvents)
        const predictions = this.dataStore.findAll('prediction')

        // THIS IS STILL NOT GETTING PARSED CORRECTLY!

        // Play with predicitons - some of these are missing schedules and routes and it's bizarre
        // debugger;

        return predictions.map(prediction => this._parsePrediction(prediction))
            // }
        }

        _parsePrediction(prediction) {
            return {
                departureTime: prediction.departure_time || prediction.schedule.departure_time || "TBD",
                destination: prediction.route.direction_destinations[0],
                trainNumber: prediction.trip.name || "TBD",
                status: prediction.status || "ON TIME",
            }
        }





        // return serialized.map(schedule => {
            //             const departure = {
            //                 departureTime: new Date (schedule.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            //                 destination: schedule.route.direction_destinations[0],
            //                 trainNumber: schedule.trip.name,
            //             }
            
            //             if (!schedule.prediction) {
            //                 const defaultPredictionData = {
            //                     track: "TBD",
            //                     status: "ON TIME",
            //                 }
            //               return Object.assign(departure, defaultPredictionData)
            //             }
            
            //             const predictionData = {
            //                 track: schedule.prediction.stop.id,
            //                 status: schedule.prediction.status.toUpperCase(),
            //             }
            
            //             return Object.assign(departure, predictionData)
            //         })
            //     }

    









}







// This is getting initted twice probably because it's in the constrcutr of the component itself and not in component did mount
// class DepartureBoardStreamingModel {
//     constructor() {
//         console.log("Innited")

//         // This endpoint does not appear to fire a lot of events
//         const url = "https://api-v3.mbta.com/predictions?"+ "filter[route_type]=2" + "&filter[stop]=place-sstat" + "&page[limit]=10" + `&api_key=${process.env.REACT_APP_MBTA_API_KEY}`

//         this.eventSource = new EventSource(url)

//         this.eventSource.addEventListener("reset", this.handleReset)





//         this.eventSource.onerror = this.errorHandler
//     }

//     handleReset(event) {
//         // First event fired
//         console.log(event)
//     }

//     eventHandler(event) {
//         debugger;
//         // console.log(event)
//     }


//     errorHandler(event) {
//         console.log(event)
//     }

//     // Start with simple index call on all predictions first (limit )



// }

// class DepartureBoardModel {
//     constructor(stationCode, routeType) {
//         this.stationCode = stationCode
//         this.routeType = routeType

//         this.apiClient = new APIClient()
//         this.dataStore = new JsonApiDataStore()

//     }

//     async getCurrentDepartures() {
//         // Need to retrieve commuter rail routes for south station first; schedule endpoint
//         // cannot filter by route type
//         const routeIDs = await this.getStationRouteIDs()


//         const now = new Date()
//         // TODO: I don't think this is going to work before 10, hours might return 2 instead of 02
//         // TODO: use fields option to only get the fields you want for schedules
//         const minTime = `${now.getHours()}:${now.getMinutes()}`
//         const filters = `filter[stop]=${this.stationCode}&filter[route]=${routeIDs}&filter[min_time]=${minTime}`
//         const include = '&include=prediction,trip,route'
//         const sortAndLimit = '&sort=departure_time&page[limit]=10'
//         const endpoint = 'schedules?' + filters + sortAndLimit + include

//         const schedulesResponse = await this.apiClient.APIGet(endpoint)
//         return this.buildDepartures(schedulesResponse)
//     }

//     async getStationRouteIDs() {
//         // TODO: might be able to cache these in some way because they don't change, API supports 304 codes
//         const endpoint = `routes?filter[type]=${this.routeType}&filter[stop]=${this.stationCode}&fields=id`
//         const response = await this.apiClient.APIGet(endpoint)
//         const serializedRoutes = this.dataStore.sync(response)

//         return serializedRoutes.map(route => route.id).join()
//     }

//     buildDepartures(scheduleData) {
//         const serialized = this.dataStore.sync(scheduleData)
//         // TODO: not sure about how accurate destinations are 

//         // This is South Station-04, I dunno if thats the track, maybe need to slice that
//         // track: schedule.prediction.stop.id,
//         return serialized.map(schedule => {
//             const departure = {
//                 departureTime: new Date (schedule.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
//                 destination: schedule.route.direction_destinations[0],
//                 trainNumber: schedule.trip.name,
//             }

//             if (!schedule.prediction) {
//                 const defaultPredictionData = {
//                     track: "TBD",
//                     status: "ON TIME",
//                 }
//               return Object.assign(departure, defaultPredictionData)
//             }

//             const predictionData = {
//                 track: schedule.prediction.stop.id,
//                 status: schedule.prediction.status.toUpperCase(),
//             }

//             return Object.assign(departure, predictionData)
//         })
//     }
// }

export class SouthStationDepartureBoard extends React.Component {
    constructor(props) {
        super(props)
        
        // Codes for Commuter Rail routes that stop at South Station
        const stationID = "place-sstat"
        const routeType = 2
        const pageLimit = 10

        this.model = new DepartureBoardModel(routeType, stationID, pageLimit)

        this.state = {
            departures: []
        }
    }

    componentDidMount() {
        // Maybe async await this
        this.model.listenForDepartureUpdates(this.onResetDepartures)
    }

    // Dunno if this is where we want to call this.
    componentWillUnmount() {
        this.model.stopListeningForDepartureUpdates()
    }

    onResetDepartures(departures) {
        console.log("Callback passed to board component")
        console.log(departures)
        // Let the model handle the parsing and update logic - it may need to keep its own 
        // this.setState({departures: departures})
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