import { currentRef, currentSchema } from '.'
import { toZod } from './objectToZod.ts'
import fs from 'fs/promises'

export type refCacheObject = { type:string }

const refCache: Map<number | bigint, refCacheObject> = new Map()

export const refResolver = async (inputRef:string) => {
    if(!currentRef || !currentSchema){ throw new Error('currentRef or currentSchema is undefined') }
    
    const hash = Bun.hash(currentSchema.name+'.'+inputRef)

    if(refCache.get(hash)){
        return refCache.get(hash) as refCacheObject
    }

    const ref = currentRef.get(inputRef)
    const refName = ref.description ? ref.description.split(' ')[0] : inputRef.split('/').pop() || 'unknown'
    
    refCache.set(hash, {
        type: refName,
    })

    const zodRef = await toZod(ref.properties)
    
    let fileContent = `import z from "zod"\n${zodRef.imports?.join('\n')}\n`
    
    fileContent += `export default ${zodRef.type}`
        
    await fs.writeFile(`./out/${currentSchema.name}/models/${refName}.ts`,fileContent)

    return refCache.get(hash) as refCacheObject
}