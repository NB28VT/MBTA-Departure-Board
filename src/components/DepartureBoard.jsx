import React from 'react'
import APIClient from '../services/APIClient'

class DepartureBoardModel {
    constructor(stationCode, routeType) {
        this.stationCode = stationCode
        this.routeType = routeType

        this.apiClient = new APIClient()
    }

    async getCurrentDepartures() {
        const routes = await this.getStationRoutes()
        console.log(routes)
    }

    async getStationRoutes() {
        // routes?filter[type]=2&filter[stop]=place-sstat&fields=id
        const endpoint = `routes?filter[type]=${this.routeType}&filter[stop]=${this.stationCode}&fields=id`
        return await this.apiClient.APIGet(endpoint)
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