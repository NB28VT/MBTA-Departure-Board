import React from 'react'

export class Board extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            departures: []
        }
    }

    componentDidMount() {

    }

    render() {
        return (
            <div>
                Table Goes Here
            </div>
        )
    }
}