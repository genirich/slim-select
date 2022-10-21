import { ensureElementInView, highlight, isValueInArrayOfObjects } from './helper'
import SlimSelect from './index'
import { Optgroup, Option } from './store'

export interface SingleSelected {
  container: HTMLDivElement
  placeholder: HTMLSpanElement
  deselect: HTMLSpanElement
  arrowIcon: {
    container: HTMLSpanElement
    arrow: HTMLSpanElement
  }
}

export interface MultiSelected {
  container: HTMLDivElement
  values: HTMLDivElement
  add: HTMLDivElement
  plus: HTMLSpanElement
}

export interface Search {
  container: HTMLDivElement
  input: HTMLInputElement
  addable?: HTMLDivElement
}

// Class is responsible for creating all the elements
export class Slim {
  public main: SlimSelect
  public container: HTMLDivElement
  public singleSelected: SingleSelected | null
  public multiSelected: MultiSelected | null
  public content: HTMLDivElement
  public search: Search
  public list: HTMLDivElement
  constructor(main: SlimSelect) {
    this.main = main

    // Create elements in order of appending
    this.container = this.containerDiv()
    this.content = this.contentDiv()
    this.search = this.searchDiv()
    this.list = this.listDiv()
    this.options()

    this.singleSelected = null
    this.multiSelected = null
    if (this.main.isMultiple) {
      this.multiSelected = this.multiSelectedDiv()
      if (this.multiSelected) {
        this.container.appendChild(this.multiSelected.container)
      }
    } else {
      this.singleSelected = this.singleSelectedDiv()
      this.container.appendChild(this.singleSelected.container)
    }
    if (this.main.settings.addToBody) {
      // add the id to the content as a class as well
      // this is important on touch devices as the close method is
      // triggered when clicks on the document body occur
      this.content.classList.add(this.main.id)
      document.body.appendChild(this.content)
    } else {
      this.container.appendChild(this.content)
    }
    this.content.appendChild(this.search.container)
    this.content.appendChild(this.list)
  }

  // Create main container
  public containerDiv(): HTMLDivElement {
    // Create main container
    const container = document.createElement('div') as HTMLDivElement

    // Add style and classes
    container.style.cssText = this.main.style

    this.updateContainerDivClass(container)

    return container
  }

  public singleSelectedDiv(): SingleSelected {
    const container: HTMLDivElement = document.createElement('div')
    container.classList.add(this.main.classes.singleSelected)

    // Placeholder text
    const placeholder: HTMLSpanElement = document.createElement('span')
    placeholder.classList.add('placeholder')
    container.appendChild(placeholder)

    // Deselect
    const deselect = document.createElement('span')
    deselect.innerHTML = this.main.settings.deselectLabel!
    deselect.classList.add('ss-deselect')
    deselect.onclick = (e) => {
      e.stopPropagation()

      // Dont do anything if disabled
      if (!this.main.settings.isEnabled) {
        return
      }

      this.main.set('')
    }
    container.appendChild(deselect)

    // Arrow
    const arrowContainer: HTMLSpanElement = document.createElement('span')
    arrowContainer.classList.add(this.main.classes.arrow)
    const arrowIcon = document.createElement('span')
    arrowIcon.classList.add('arrow-down')
    arrowContainer.appendChild(arrowIcon)
    container.appendChild(arrowContainer)

    // Add onclick for main selector div
    container.onclick = () => {
      if (!this.main.settings.isEnabled) {
        return
      }

      this.main.data.contentOpen ? this.main.close() : this.main.open()
    }

    return {
      container,
      placeholder,
      deselect,
      arrowIcon: {
        container: arrowContainer,
        arrow: arrowIcon,
      },
    }
  }

  // Based upon current selection set placeholder text
  public placeholder(): void {
    const selected = this.main.data.getSelected() as Option

    // Placeholder display
    if (selected === null || (selected && selected.placeholder)) {
      const placeholder = document.createElement('span')
      placeholder.classList.add(this.main.classes.disabled)
      placeholder.innerHTML = this.main.settings.placeholderText
      if (this.singleSelected) {
        this.singleSelected.placeholder.innerHTML = placeholder.outerHTML
      }
    } else {
      let selectedValue = ''
      if (selected) {
        selectedValue =
          selected.innerHTML && this.main.settings.valuesUseText !== true ? selected.innerHTML : selected.text
      }
      if (this.singleSelected) {
        this.singleSelected.placeholder.innerHTML = selected ? selectedValue : ''
      }
    }
  }

  // Based upon current selection/settings hide/show deselect
  public deselect(): void {
    if (this.singleSelected) {
      // if allowDeselect is false just hide it
      if (!this.main.settings.allowDeselect) {
        this.singleSelected.deselect.classList.add('ss-hide')
        return
      }

      if (this.main.selected() === '') {
        this.singleSelected.deselect.classList.add('ss-hide')
      } else {
        this.singleSelected.deselect.classList.remove('ss-hide')
      }
    }
  }

  public multiSelectedDiv(): MultiSelected {
    const container = document.createElement('div')
    container.classList.add(this.main.classes.multiSelected)

    const values = document.createElement('div')
    values.classList.add(this.main.classes.values)
    container.appendChild(values)

    const add = document.createElement('div')
    add.classList.add(this.main.classes.add)
    const plus = document.createElement('span')
    plus.classList.add(this.main.classes.plus)
    plus.onclick = (e) => {
      if (this.main.data.contentOpen) {
        this.main.close()
        e.stopPropagation()
      }
    }
    add.appendChild(plus)
    container.appendChild(add)

    container.onclick = (e) => {
      if (!this.main.settings.isEnabled) {
        return
      }

      // Open only if you are not clicking on x text
      const target = e.target as Element
      if (!target.classList.contains(this.main.classes.valueDelete)) {
        this.main.data.contentOpen ? this.main.close() : this.main.open()
      }
    }

    return {
      container,
      values,
      add,
      plus,
    }
  }

  // Get selected values and append to multiSelected values container
  // and remove those who shouldnt exist
  public values(): void {
    if (!this.multiSelected) {
      return
    }
    let currentNodes = this.multiSelected.values.childNodes as any as HTMLDivElement[]
    const selected = this.main.data.getSelected() as Option[]

    // Remove nodes that shouldnt be there
    let exists
    const nodesToRemove = []
    for (const c of currentNodes) {
      exists = true
      for (const s of selected) {
        if (String(s.id) === String(c.dataset.id)) {
          exists = false
        }
      }

      if (exists) {
        nodesToRemove.push(c)
      }
    }

    for (const n of nodesToRemove) {
      n.classList.add('ss-out')
      this.multiSelected.values.removeChild(n)
    }

    // Add values that dont currently exist
    currentNodes = this.multiSelected.values.childNodes as any as HTMLDivElement[]
    for (let s = 0; s < selected.length; s++) {
      exists = false
      for (const c of currentNodes) {
        if (String(selected[s].id) === String(c.dataset.id)) {
          exists = true
        }
      }

      if (!exists) {
        if (currentNodes.length === 0 || !HTMLElement.prototype.insertAdjacentElement) {
          this.multiSelected.values.appendChild(this.valueDiv(selected[s]))
        } else if (s === 0) {
          this.multiSelected.values.insertBefore(this.valueDiv(selected[s]), currentNodes[s] as any)
        } else {
          ;(currentNodes[s - 1] as any).insertAdjacentElement('afterend', this.valueDiv(selected[s]))
        }
      }
    }

    // If there are no values set placeholder
    if (selected.length === 0) {
      const placeholder = document.createElement('span')
      placeholder.classList.add(this.main.classes.disabled)
      placeholder.innerHTML = this.main.settings.placeholderText
      this.multiSelected.values.innerHTML = placeholder.outerHTML
    }
  }

  public valueDiv(optionObj: Option): HTMLDivElement {
    const value = document.createElement('div')
    value.classList.add(this.main.classes.value)
    value.dataset.id = optionObj.id

    const text = document.createElement('span')
    text.classList.add(this.main.classes.valueText)
    text.innerHTML =
      optionObj.innerHTML && this.main.settings.valuesUseText !== true ? optionObj.innerHTML : optionObj.text
    value.appendChild(text)

    if (!optionObj.mandatory) {
      const deleteSpan = document.createElement('span')
      deleteSpan.classList.add(this.main.classes.valueDelete)
      deleteSpan.innerHTML = this.main.settings.deselectLabel
      deleteSpan.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        let shouldUpdate = false

        // If no beforeOnChange is set automatically update at end
        if (!this.main.events.beforeOnChange) {
          shouldUpdate = true
        }

        if (this.main.events.beforeOnChange) {
          const selected = this.main.data.getSelected() as Option
          const currentValues = JSON.parse(JSON.stringify(selected))

          // Remove from current selection
          for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i].id === optionObj.id) {
              currentValues.splice(i, 1)
            }
          }

          const beforeOnchange = this.main.events.beforeOnChange(currentValues)
          if (beforeOnchange !== false) {
            shouldUpdate = true
          }
        }

        if (shouldUpdate) {
          this.main.data.removeFromSelected(optionObj.id as any, 'id')
          this.main.render()
          this.main.selectClass.setValue()
          this.main.data.onDataChange() // Trigger on change callback
        }
      }

      value.appendChild(deleteSpan)
    }

    return value
  }

  // Create content container
  public contentDiv(): HTMLDivElement {
    const container = document.createElement('div')
    container.classList.add(this.main.classes.content)
    return container
  }

  public searchDiv(): Search {
    const container = document.createElement('div')
    const input = document.createElement('input')
    const addable = document.createElement('div')
    container.classList.add(this.main.classes.search)

    // Setup search return object
    const searchReturn: Search = {
      container,
      input,
    }

    // We still want the search to be tabable but not shown
    if (!this.main.settings.showSearch) {
      container.classList.add(this.main.classes.hide)
      input.readOnly = true
    }

    input.type = 'search'
    input.placeholder = this.main.settings.searchPlaceholder
    input.tabIndex = 0
    input.setAttribute('aria-label', this.main.settings.searchPlaceholder)
    input.setAttribute('autocapitalize', 'off')
    input.setAttribute('autocomplete', 'off')
    input.setAttribute('autocorrect', 'off')
    input.onclick = (e) => {
      setTimeout(() => {
        const target = e.target as HTMLInputElement
        if (target.value === '') {
          this.main.search('')
        }
      }, 10)
    }
    input.onkeydown = (e) => {
      if (e.key === 'ArrowUp') {
        this.main.open()
        this.highlightUp()
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        this.main.open()
        this.highlightDown()
        e.preventDefault()
      } else if (e.key === 'Tab') {
        if (!this.main.data.contentOpen) {
          setTimeout(() => {
            this.main.close()
          }, this.main.settings.timeoutDelay)
        } else {
          this.main.close()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
      }
    }
    input.onkeyup = (e) => {
      const target = e.target as HTMLInputElement
      if (e.key === 'Enter') {
        if (this.main.events.addable && e.ctrlKey) {
          addable.click()
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const highlighted = this.list.querySelector('.' + this.main.classes.highlighted) as HTMLDivElement
        if (highlighted) {
          highlighted.click()
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Cancel out to leave for onkeydown to handle
      } else if (e.key === 'Escape') {
        this.main.close()
      } else {
        if (this.main.settings.showSearch && this.main.data.contentOpen) {
          this.main.search(target.value)
        } else {
          input.value = ''
        }
      }
      e.preventDefault()
      e.stopPropagation()
    }
    input.onfocus = () => {
      this.main.open()
    }
    container.appendChild(input)

    if (this.main.events.addable) {
      addable.classList.add(this.main.classes.addable)
      addable.innerHTML = '+'
      addable.onclick = (e) => {
        if (this.main.events.addable) {
          e.preventDefault()
          e.stopPropagation()

          const inputValue = this.search.input.value
          if (inputValue.trim() === '') {
            this.search.input.focus()
            return
          }

          const addableValue = this.main.events.addable(inputValue)
          let addableValueStr = ''
          if (!addableValue) {
            return
          }

          if (typeof addableValue === 'object') {
            const validValue = validateOption(addableValue)
            if (validValue) {
              this.main.addData(addableValue)
              addableValueStr = addableValue.value ? addableValue.value : addableValue.text
            }
          } else {
            this.main.addData(
              this.main.data.newOption({
                text: addableValue,
                value: addableValue,
              }),
            )
            addableValueStr = addableValue
          }

          this.main.search('')
          setTimeout(() => {
            // Temp fix to solve multi render issue
            this.main.set(addableValueStr, 'value', false, false)
          }, 100)

          // Close it only if closeOnSelect = true
          if (this.main.settings.closeOnSelect) {
            setTimeout(() => {
              // Give it a little padding for a better looking animation
              this.main.close()
            }, 100)
          }
        }
      }
      container.appendChild(addable)

      searchReturn.addable = addable
    }

    return searchReturn
  }

  public highlightUp(): void {
    const highlighted = this.list.querySelector('.' + this.main.classes.highlighted) as HTMLDivElement
    let prev: HTMLDivElement | null = null
    if (highlighted) {
      prev = highlighted.previousSibling as HTMLDivElement
      while (prev !== null) {
        if (prev.classList.contains(this.main.classes.disabled)) {
          prev = prev.previousSibling as HTMLDivElement
          continue
        } else {
          break
        }
      }
    } else {
      const allOptions = this.list.querySelectorAll(
        '.' + this.main.classes.option + ':not(.' + this.main.classes.disabled + ')',
      )
      prev = allOptions[allOptions.length - 1] as HTMLDivElement
    }

    // Do not select if optgroup label
    if (prev && prev.classList.contains(this.main.classes.optgroupLabel)) {
      prev = null
    }

    // Check if parent is optgroup
    if (prev === null) {
      const parent = highlighted.parentNode as HTMLDivElement
      if (parent.classList.contains(this.main.classes.optgroup)) {
        if (parent.previousSibling) {
          const prevNodes = (parent.previousSibling as HTMLDivElement).querySelectorAll(
            '.' + this.main.classes.option + ':not(.' + this.main.classes.disabled + ')',
          )
          if (prevNodes.length) {
            prev = prevNodes[prevNodes.length - 1] as HTMLDivElement
          }
        }
      }
    }

    // If previous element exists highlight it
    if (prev) {
      if (highlighted) {
        highlighted.classList.remove(this.main.classes.highlighted)
      }
      prev.classList.add(this.main.classes.highlighted)
      ensureElementInView(this.list, prev)
    }
  }

  public highlightDown(): void {
    const highlighted = this.list.querySelector('.' + this.main.classes.highlighted) as HTMLDivElement
    let next = null

    if (highlighted) {
      next = highlighted.nextSibling as HTMLDivElement
      while (next !== null) {
        if (next.classList.contains(this.main.classes.disabled)) {
          next = next.nextSibling as HTMLDivElement
          continue
        } else {
          break
        }
      }
    } else {
      next = this.list.querySelector(
        '.' + this.main.classes.option + ':not(.' + this.main.classes.disabled + ')',
      ) as HTMLDivElement
    }

    // Check if parent is optgroup
    if (next === null && highlighted !== null) {
      const parent = highlighted.parentNode as HTMLDivElement
      if (parent.classList.contains(this.main.classes.optgroup)) {
        if (parent.nextSibling) {
          const sibling = parent.nextSibling as HTMLDivElement
          next = sibling.querySelector(
            '.' + this.main.classes.option + ':not(.' + this.main.classes.disabled + ')',
          ) as HTMLDivElement
        }
      }
    }

    // If previous element exists highlight it
    if (next) {
      if (highlighted) {
        highlighted.classList.remove(this.main.classes.highlighted)
      }
      next.classList.add(this.main.classes.highlighted)
      ensureElementInView(this.list, next)
    }
  }

  // Create main container that options will reside
  public listDiv(): HTMLDivElement {
    const list = document.createElement('div')
    list.classList.add(this.main.classes.list)
    list.setAttribute('role', 'listbox')
    return list
  }

  // Loop through data || filtered data and build options and append to list container
  public options(content: string = ''): void {
    const data = this.main.data.filtered || this.main.data.data

    // Clear out innerHtml
    this.list.innerHTML = ''

    // If content is being passed just use that text
    if (content !== '') {
      const searching = document.createElement('div')
      searching.classList.add(this.main.classes.option)
      searching.classList.add(this.main.classes.disabled)
      searching.innerHTML = content
      this.list.appendChild(searching)
      return
    }

    // If ajax and isSearching
    if (this.main.isAjax && this.main.isSearching) {
      const searching = document.createElement('div')
      searching.classList.add(this.main.classes.option)
      searching.classList.add(this.main.classes.disabled)
      searching.innerHTML = this.main.settings.searchingText
      this.list.appendChild(searching)
      return
    }

    // If no results show no results text
    if (data.length === 0) {
      const noResults = document.createElement('div')
      noResults.classList.add(this.main.classes.option)
      noResults.classList.add(this.main.classes.disabled)
      noResults.innerHTML = this.main.settings.searchText
      this.list.appendChild(noResults)
      return
    }

    // Append individual options to div container
    for (const d of data) {
      // Create optgroup
      if (d.hasOwnProperty('label')) {
        const item = d as Optgroup
        const optgroupEl = document.createElement('div')
        optgroupEl.classList.add(this.main.classes.optgroup)

        // Create label
        const optgroupLabel = document.createElement('div')
        optgroupLabel.classList.add(this.main.classes.optgroupLabel)
        if (this.main.settings.selectByGroup && this.main.isMultiple) {
          optgroupLabel.classList.add(this.main.classes.optgroupLabelSelectable)
        }
        optgroupLabel.innerHTML = item.label
        optgroupEl.appendChild(optgroupLabel)

        const options = item.options
        if (options) {
          for (const o of options) {
            optgroupEl.appendChild(this.option(o))
          }

          // Selecting all values by clicking the group label
          if (this.main.settings.selectByGroup && this.main.isMultiple) {
            const master = this
            optgroupLabel.addEventListener('click', (e: MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()

              for (const childEl of optgroupEl.children as any as HTMLDivElement[]) {
                if (childEl.className.indexOf(master.main.classes.option) !== -1) {
                  childEl.click()
                }
              }
            })
          }
        }
        this.list.appendChild(optgroupEl)
      } else {
        this.list.appendChild(this.option(d as Option))
      }
    }
  }

  // Create single option
  public option(data: Option): HTMLDivElement {
    // Add hidden placeholder
    if (data.placeholder) {
      const placeholder = document.createElement('div')
      placeholder.classList.add(this.main.classes.option)
      placeholder.classList.add(this.main.classes.hide)
      return placeholder
    }

    const optionEl = document.createElement('div')

    // Add class to div element
    optionEl.classList.add(this.main.classes.option)
    // Add WCAG attribute
    optionEl.setAttribute('role', 'option')
    if (data.class) {
      data.class.split(' ').forEach((dataClass: string) => {
        optionEl.classList.add(dataClass)
      })
    }

    // Add style to div element
    if (data.style) {
      optionEl.style.cssText = data.style
    }

    const selected = this.main.data.getSelected() as Option

    optionEl.dataset.id = data.id
    if (
      this.main.settings.searchHighlight &&
      this.main.slim &&
      data.innerHTML &&
      this.main.slim.search.input.value.trim() !== ''
    ) {
      optionEl.innerHTML = highlight(
        data.innerHTML,
        this.main.slim.search.input.value,
        this.main.classes.searchHighlighter,
      )
    } else if (data.innerHTML) {
      optionEl.innerHTML = data.innerHTML
    }
    if (this.main.settings.showOptionTooltips && optionEl.textContent) {
      optionEl.setAttribute('title', optionEl.textContent)
    }
    const master = this
    optionEl.addEventListener('click', function (e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()

      const element = this
      const elementID = element.dataset.id

      if (data.selected === true && master.main.settings.allowDeselectOption) {
        let shouldUpdate = false

        // If no beforeOnChange is set automatically update at end
        if (!master.main.events.beforeOnChange || !master.main.isMultiple) {
          shouldUpdate = true
        }

        if (master.main.events.beforeOnChange && master.main.isMultiple) {
          const selectedValues = master.main.data.getSelected() as Option
          const currentValues = JSON.parse(JSON.stringify(selectedValues))

          // Remove from current selection

          for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i].id === elementID) {
              currentValues.splice(i, 1)
            }
          }

          const beforeOnchange = master.main.events.beforeOnChange(currentValues)
          if (beforeOnchange !== false) {
            shouldUpdate = true
          }
        }

        if (shouldUpdate) {
          if (master.main.isMultiple) {
            master.main.data.removeFromSelected(elementID as any, 'id')
            master.main.render()
            master.main.selectClass.setValue()
            master.main.data.onDataChange() // Trigger on change callback
          } else {
            master.main.set('')
          }
        }
      } else {
        // Check if option is disabled or is already selected, do nothing
        if (data.disabled || data.selected) {
          return
        }

        // Check if hit limit
        if (master.main.settings.limit && Array.isArray(selected) && master.main.settings.limit <= selected.length) {
          return
        }

        if (master.main.events.beforeOnChange) {
          let value
          const objectInfo = JSON.parse(JSON.stringify(master.main.data.getObjectFromData(elementID as string)))
          objectInfo.selected = true

          if (master.main.isMultiple) {
            value = JSON.parse(JSON.stringify(selected))
            value.push(objectInfo)
          } else {
            value = JSON.parse(JSON.stringify(objectInfo))
          }

          const beforeOnchange = master.main.events.beforeOnChange(value)
          if (beforeOnchange !== false) {
            master.main.set(elementID as string, 'id', master.main.settings.closeOnSelect)
          }
        } else {
          master.main.set(elementID as string, 'id', master.main.settings.closeOnSelect)
        }
      }
    })

    const isSelected = selected && isValueInArrayOfObjects(selected, 'id', data.id as string)
    if (data.disabled || isSelected) {
      optionEl.onclick = null
      if (!master.main.settings.allowDeselectOption) {
        optionEl.classList.add(this.main.classes.disabled)
      }
      if (master.main.settings.hideSelectedOption) {
        optionEl.classList.add(this.main.classes.hide)
      }
    }

    if (isSelected) {
      optionEl.classList.add(this.main.classes.optionSelected)
    } else {
      optionEl.classList.remove(this.main.classes.optionSelected)
    }

    return optionEl
  }
}