import React from 'react'
import APIClient from '../services/APIClient'

// TODO: maybe use MobX here
class DepartureBoardModel {
    constructor(stationCode, routeType) {
        this.stationCode = stationCode
        this.routeType = routeType

        this.apiClient = new APIClient()
    }

    async getCurrentDepartures() {
        // TODO: use fields option to only get the fields you want for schedules

        // Feck we do need routes endpoint to get commuter raile routes, this schedule endpoint can't filter by route type boooo
        const routes = await this.getStationRoutes()
        // Yuck - there is def a more eloquent way to do this
        const routeIDs = Object.values(routes.route).map(route => route.id).join()


        // Time before which schedule should not be returned. To filter times after midnight use more than 24 hours. For example, min_time=24:00 will return schedule information for the next calendar day, since that service is considered part of the current service day. Additionally, min_time=00:00&max_time=02:00 will not return anything. The time format is HH:MM.

        const now = new Date()
        // TODO: I don't think this is going to work before 10, hours might return 2 instead of 02, hmm
        const minTime = `${now.getHours()}:${now.getMinutes()}`
        const filters = `filter[stop]=${this.stationCode}&filter[route]=${routeIDs}&filter[min_time]=${minTime}`
        const include = '&include=prediction,trip,route'
        const sortAndLimit = '&sort=departure_time&page[limit]=10'
        const endpoint = 'schedules?' + filters + sortAndLimit + include

        const schedulesResponse = await this.apiClient.APIGet(endpoint)

        return this.serializeDepartures(normalize(schedulesResponse))
    }

    async getStationRoutes() {
        // TODO: might be able to cache these in some way because they don't change, API supports 304 codes
        const endpoint = `routes?filter[type]=${this.routeType}&filter[stop]=${this.stationCode}&fields=id`
        const routesResponse = await this.apiClient.APIGet(endpoint)

        return normalize(routesResponse)
    }


    serializeDepartures(response) {
        // If no prediction, assume on time
        const schedules = Object.values(response.schedule)
        const trips = Object.values(response.trip)
        const routes = Object.values(response.route)
        // const predictions = Object.values(response.prediction)
        
        return schedules.map((schedule => {

            // Yuck
            const route = routes[schedule.relationships.route.data.id]
            debugger



            // debugger;
            // Not sure if destinations is accurate

            const data = {
                departureTime: schedule.attributes.departureTime,
                destination: route.attributes.directionDestinations[0],
            }

            console.log(data)

            // Carrier: Just do MBTA
            // Departure Time: on the schedule endpoint
            // Status: include prediciton and cross reference to determine if it's on time
            // Destination: include route and maybe that gets us destination
            // Track #: might be on the trip?
            // Train #: might also be on the trip
            // Station: south station place filter
            // Commuter Rail: route_type = 2
            // Upcoming: sort by min time I think 


        }))

        
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
        console.log(departures)
        // I think this just works:
        this.setState(departures)
    }

    render() {
        return (
            <div>
                Table Goes Here
            </div>
        )
    }
}