import SwaggerParser from "@apidevtools/swagger-parser"
import { toZod } from "./objectToZod.ts"
import { refResolver } from "./refResolver.ts"
import fs from 'fs/promises'

const swaggerSchemas = [
    {
        'name': 'eu-1',
        'url': 'https://app1.eu.monsido.com/api/docs/v1'
    },
    {
        'name': 'stavox',
        'url': './swagger.json'
    },
    // {
    //     name: 'github',
    //     url: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/ghes-3.9/ghes-3.9.2022-11-28.json'
    // }
    // {
    //     'name': 'petstore',
    //      'url': 'https://petstore.swagger.io/v2/swagger.json'
    // }
] as const

type importBasedResponse = {response: string, type:string, import:string}
type zodBasedResponse = {response: string, type: any}

export let currentRef: SwaggerParser.$Refs | undefined = undefined
export let currentSchema: typeof swaggerSchemas[number] | undefined = undefined

async function main() {
    await fs.rm('./out', { recursive: true, force: true })
    if(!await fs.exists('./out')){ await fs.mkdir('./out') }
    for (const schema of swaggerSchemas) {
        if(!await fs.exists(`./out/${schema.name}`)){ await fs.mkdir(`./out/${schema.name}`) }
        if(!await fs.exists(`./out/${schema.name}/models`)){ await fs.mkdir(`./out/${schema.name}/models`) }
        
        currentRef = await SwaggerParser.resolve(schema.url)
        currentSchema = schema

        const refValues = currentRef.values()

        for (const domain in refValues) {
            const paths = refValues[domain].paths
            for (const path in paths) {
                for (const method in paths[path]) {
                    const currentMethod = paths[path][method]

                    const importBasedResponse:  importBasedResponse[] = []
                    const zodBasedResponse: zodBasedResponse[] = []

                    for (const response in currentMethod.responses) {
                        const isArray = currentMethod.responses[response].schema?.type === 'array'
                        const ref = isArray ? currentMethod.responses[response].schema.items.$ref : currentMethod.responses[response].schema?.$ref || undefined

                        if(ref){
                            const resolvedRef = await refResolver(ref)

                            importBasedResponse.push({
                                response,
                                type: isArray ? `z.array(${resolvedRef.type})` : resolvedRef.type,
                                import: `import ${resolvedRef.type} from "./models/${resolvedRef.type}"`
                            })
                            continue
                        }

                        if(isArray){throw new Error('Array without ref')}

                        zodBasedResponse.push({
                            response: response,
                            type: (await toZod(currentMethod.responses[response].properties)).type
                        })
                    }

                    let fileContent = 'import z from "zod"\n'

                    const uniqueImports = Array.from(new Set(importBasedResponse.map(item => item.import)));

                    for (const extraImport of uniqueImports) {
                        fileContent += extraImport + '\n'
                    }

                    fileContent += `\nexport const ${currentMethod.operationId} = {\n`

                    const mergedResponses = [...importBasedResponse,...zodBasedResponse].sort((a, b) => Number(a.response) - Number(b.response)) 

                    for (const type of mergedResponses) {
                        fileContent += `    ${type.response}: ${type.type},\n`
                    }

                    fileContent += '}'

                    await fs.writeFile(`./out/${schema.name}/${currentMethod.operationId}.ts`, fileContent)
                }
            }
        }
    }

    console.log('Done')
}

await main()

let a: any = {}

a.a = a
console.log(a)