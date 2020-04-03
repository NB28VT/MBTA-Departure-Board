// NO. Requires schema, fuck that
// import JSONAPISerializer from 'json-api-serializer'

export class APIClient {
    constructor() {
        this.baseURL = "https://api-v3.mbta.com/"
    }

    async APIGet(endpoint) {
        // I don't think I need async if it returns a promise anyway
        // TODO: can use headers here for streaming possibly
        return new Promise((resolve, reject) => {
            const url = this.baseURL + endpoint + `&api_key=${process.env.REACT_APP_MBTA_API_KEY}`
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(response.statusText)
                    }
                    return response.json()
                }).then(body => {
                    // Not sure about this
                    resolve(body)
                })
                .catch(error => {
                    console.log(error)
                    reject(error)
                })
        })
    }
}