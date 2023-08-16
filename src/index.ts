import SwaggerParser from "@apidevtools/swagger-parser"
import * as fs from 'fs-extra'
import { toZod } from "./objectToZod"

const swaggerSchemas = [
    {
        'name': 'eu-1',
        'url': 'https://app1.eu.monsido.com/api/docs/v1'
    }
] as const

type refCacheObject = {type:string, import:string}
type importBasedResponse = {response: string, type:string, import:string}
type zodBasedResponse = {response: string, type: any}

async function main() {
    await fs.ensureDir('./out')
    for (const schema of swaggerSchemas) {
        await fs.ensureDir(`./out/${schema.name}`)
        await fs.ensureDir(`./out/${schema.name}/models`)
        
        const refs = await SwaggerParser.resolve(schema.url)
        const refValues = refs.values()

        const refCache: Record<string, refCacheObject> = {}
        const refResolver = async (inputRef:string) => {
            if(refCache[inputRef]){
                return refCache[inputRef]
            }
            const ref = refs.get(inputRef)
            const refName = ref.description.split(' ')[0]
            const zodRef = await toZod(ref.properties)

            await fs.writeFile(`./out/${schema.name}/models/${refName}.ts`,`import z from "zod"\n\nexport default ${zodRef}`)

            refCache[inputRef] = {
                type: refName,
                import:`import ${refName} from "./models/${refName}"`
            }

            return refCache[inputRef]
        }

        for (const domain in refValues) {
            const paths = refValues[domain].paths
            for (const path in paths) {
                for (const method in paths[path]) {
                    const currentMethod = paths[path][method]
                    const importBasedResponse:  importBasedResponse[] = []
                    const zodBasedResponse: zodBasedResponse[] = []

                    for (const response in currentMethod.responses) {
                        try {
                            const ref = currentMethod.responses[response].schema['$ref']
                            
                            importBasedResponse.push({
                                response,
                                ...(await refResolver(ref))
                            })
                        }catch{
                            zodBasedResponse.push({
                                response: response,
                                type: await toZod(currentMethod.responses[response].properties)
                            })
                        }            
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
}

main()