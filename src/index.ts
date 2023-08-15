import SwaggerParser from "@apidevtools/swagger-parser"
import * as fs from 'fs-extra'
import { toZod } from "./objectToZod"

const swaggerSchemas = [
    {
        'name': 'eu-1',
        'url': 'https://app1.eu.monsido.com/api/docs/v1'
    }
] as const

async function main() {
    await fs.ensureDir('./out')
    for (const schema of swaggerSchemas) {
        await fs.ensureDir(`./out/${schema.name}`)
        const refs = await SwaggerParser.resolve(schema.url)
        const refValues = refs.values()
        for (const domain in refValues) {
            const domainPaths = refValues[domain].paths
            for (const path in domainPaths) {
                for (const method in domainPaths[path]) {
                    const current = domainPaths[path][method]
                    const name = current.operationId
                    let fileContent = `import z from "zod"\n\nexport const ${name} = {\n`
                    for (const response in current.responses) {
                        let ref = undefined

                        try {
                            ref = current.responses[response].schema['$ref']
                        }catch{}
                    
                        const zodObject = await toZod(ref ? refs.get(ref).properties : current.responses[response].properties, response)
                        
                        fileContent += `    ${response}: ${zodObject},\n`
                    }
                    fileContent += '} as const'
                    await fs.writeFile(`./out/${schema.name}/${name}.ts`, fileContent)
                }
            }
        }
    }
}

main()