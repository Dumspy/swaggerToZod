import * as fs from 'fs-extra'
import { currentRef, currentSchema } from '.'
import { toZod } from './objectToZod'

type refCacheObject = {type:string}
const refCache: Record<string, refCacheObject> = {}

export const refResolver = async (inputRef:string) => {
    if(!currentRef || !currentSchema){ throw new Error('currentRef or currentSchema is undefined') }

    if(refCache[currentSchema.name+'.'+inputRef]){
        return refCache[currentSchema.name+'.'+inputRef]
    }

    const ref = currentRef.get(inputRef)
    const refName = ref.description ? ref.description.split(' ')[0] : inputRef.split('/').pop() || 'unknown'
    const zodRef = await toZod(ref.properties)

    let fileContent = `import z from "zod"\n${zodRef.imports?.join('\n')}\n`
    
    fileContent += `export default ${zodRef.type}`

    await fs.writeFile(`./out/${currentSchema.name}/models/${refName}.ts`,fileContent)

    refCache[currentSchema.name+'.'+inputRef] = {
        type: refName,
    }

    return refCache[currentSchema.name+'.'+inputRef]
}