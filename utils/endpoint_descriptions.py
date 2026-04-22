# Description and Values for FastAPI Endpoint Examples:
successful_description = {
    "summary": "Accurate Type Values",
    "description": "Returns 'Data Received' message with Status Code 200",
}

invalid_description = { 
    "summary": "Invalid data is rejected with an error",
    "value": {
        "problem": "Quiero un kilo de tortilla.",
    }
}
                
sample_data_values = {
    "chat1": {
        "problem" : "Estoy en peligro"
    },
    "chat2": {
        "problem" : "huele a gas"
    }              
}

def getEndpointDescription(key=str):
    return {
                "Successful Response": successful_description,
                "Succes with Sample Data": {
                    "summary": "With Sample Data",
                    "description": "Uses expected values. Returns 'Data Received' message with Status Code 200",
                    "value": {f"{key}" : sample_data_values[key]},
                },
                "invalid": invalid_description
    }