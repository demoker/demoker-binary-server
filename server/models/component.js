'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ComponentSchema = new Schema({
    xcode_version: String,
    configuration: String,
    name: String,
    version: String,
    annotate: String,
    sha: String,
    create_at: {
        type: Date,
        default: Date.now()
    }
})

mongoose.model('Component', ComponentSchema)