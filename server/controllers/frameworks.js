'use strict'

require('../models/component')

const dir = require('../utils/dir')
const path = require('path')
const fs = require('fs')
const fsp = require('fs-promise')
const os = require('os')
const util = require('util')
const koaBody = require('koa-body')
const send = require('koa-send');

// /usr/local/var/mongodb
const mongoose = require('mongoose'),
    Component = mongoose.model('Component')


async function show(ctx) {
    const xcode_version = ctx.params.xcode_version
    const configuration = ctx.params.configuration
    const name = ctx.params.name
    const version = ctx.params.version
    let conditions = {}

    if (name && version && xcode_version && configuration) {
        conditions = { name: name, version: version , xcode_version: xcode_version, configuration: configuration}
    }

    let names = ctx.params.names
    if (names) {
        names = names.split(',')
        conditions = { name: { $in: names } }
    }

    const components = await Component.find(conditions).exec()

    let body = {}
    for (const i in components) {
        let name = components[i].name
        body[name] = body[name] || []
        body[name].push(components[i].version)
    }

    // ctx.body = body
    const response = {
        success: true,
        message: body
    };
      
    ctx.body = JSON.stringify(response);
}

async function create(ctx) {
    const xcode_version = ctx.request.body.fields.xcode_version
    const configuration = ctx.request.body.fields.configuration
    const name = ctx.request.body.fields.name
    const version = ctx.request.body.fields.version

    console.log('name = %s, version = %s, xcode = %s, conf = %s', name, version, xcode_version, configuration);
    const binaryDir = dir.binaryDir( xcode_version, configuration, name, version)
    console.log('path = %s', binaryDir);
    if (!fs.existsSync(binaryDir)) {
        await dir.mkdirp(binaryDir)
    }

    const file = ctx.request.body.files.file

    let component = await Component.where({ xcode_version: xcode_version, configuration: configuration, name: name, version: version }).findOne().exec()
        // let oldFiles = await fsp.readdir(binaryDir)
        // oldFiles = oldFiles.filter((name) => { return name == file.name })
    if (component) {
        const response = {
            success: false,
            message: util.format('二进制文件已经存在 %s %s %s (%s)', xcode_version, configuration, name, version)
        };
          
        ctx.body = JSON.stringify(response);
        // ctx.body = util.format('二进制文件已经存在 %s (%s)', name, version)
        return
    }

    const filePath = path.join(binaryDir, file.name)
    const reader = fs.createReadStream(file.path)
    const writer = fs.createWriteStream(filePath)
    reader.pipe(writer)

    component = new Component
    component.xcode_version = xcode_version
    component.configuration = configuration
    component.name = name
    component.version = version
    try {
        await component.save()
    } catch (error) {
        console.log(error)
        // ctx.body = error.message
        const response = {
            message: error.message,
            success: false
        };
          
        ctx.body = JSON.stringify(response);
        return
    }

    const response = {
        message: util.format('保存成功 %s (%s)', name, version),
        success: true
    };
      
    ctx.body = JSON.stringify(response);
    // ctx.body = util.format('保存成功 %s (%s)', name, version)
}

async function destroy(ctx) {
    const xcode_version = ctx.params.xcode_version
    const configuration = ctx.params.configuration
    const name = ctx.params.name
    const version = ctx.params.version
    console.log('准备删除：%s, %s, %s, %s', xcode_version, configuration, name, version)
    const component = await Component.where({ xcode_version: xcode_version, configuration: configuration, name: name, version: version }).findOne().exec()
    if (!component) {
        ctx.status = 404
        const response = {
            success: false,
            message: util.format('无二进制文件 %s (%s)', name, version)
        };
        ctx.body = JSON.stringify(response);
        // ctx.body = util.format('无二进制文件 %s (%s)', name, version)
        return
    }

    const binaryDir = path.join(dir.binaryRoot(), xcode_version, configuration, name, version)
    if (fs.existsSync(binaryDir)) {
        await dir.rmdir(binaryDir)
    }

    try {
        await Component.remove({ xcode_version: xcode_version, configuration: configuration, name: name, version: version })
    } catch (error) {
        console.log(error)
        // ctx.body = error.message
        const response = {
            message: error.message,
            success: false
        };
          
        ctx.body = JSON.stringify(response);
        return
    }

    const response = {
        success: true,
        message: util.format('删除成功 %s (%s)', name, version)
    };
      
    ctx.body = JSON.stringify(response);
    // ctx.body = util.format('删除成功 %s (%s)', name, version)
}

async function download(ctx) {
    const xcode_version = ctx.params.xcode_version;
    const configuration = ctx.params.configuration;
    const name = ctx.params.name;
    const version = ctx.params.version;

    const component = await Component.where({ xcode_version, configuration, name, version }).findOne().exec();
    if (!component) {
        ctx.status = 404;
        ctx.body = {
            success: false,
            message: `无二进制文件 ${name} (${version})`
        };
        return;
    }

    const binaryDir = dir.binaryDir(xcode_version, configuration, name, version);
    const binaryFiles = await fsp.readdir(binaryDir);
    const binaryFile = binaryFiles.shift();

    console.log('%s', binaryDir);
    console.log('%s', binaryFile);

    if (!binaryFile) {
        ctx.status = 404;
        ctx.body = {
            success: false,
            message: `无二进制文件 ${name} (${version})`
        };
        return;
    }
    
    const binaryPath = path.join(binaryDir, binaryFile);
    ctx.attachment(binaryFile);
    ctx.type = 'zip';
    ctx.body = fs.createReadStream(binaryPath);
}

module.exports = {
    show,
    create,
    destroy,
    download
}