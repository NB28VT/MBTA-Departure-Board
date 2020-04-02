export default class APIClient {
    constructor() {
        this.baseURL = "https://api-v3.mbta.com/"
        
        // https://api-v3.mbta.com/routes?filter[type]=2&filter[stop]=place-sstat&fields=id
    }


    async APIGet(endpoint) {
        // Look into using JSONAPI serializer here
        // I don't think I need async if it returns a promise anyway
        // TODO: can use headers here for streaming possibly
        return new Promise((resolve, reject) => {
            const url = this.baseURL + endpoint + `&api_key=${process.env.REACT_APP_MBTA_API_KEY}`
            console.log(url)
            fetch(url)
                .then(response => {
                    return response.json()
                }).catch(e => reject(e)) 
            //     })
            //     .then(body => {
            //         return resp.ok ? resolve(body) : reject(resp)
            //     }
            // ).catch(error => reject(error))
        })
    }
}