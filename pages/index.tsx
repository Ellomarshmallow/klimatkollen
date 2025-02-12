import { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import { ReactElement, useEffect, useState } from 'react'
import styled from 'styled-components'

import { useRouter } from 'next/router'
import DropDown from '../components/DropDown'
import MetaTags from '../components/MetaTags'
import { H2Regular, H5Regular, Paragraph } from '../components/Typography'
import { Municipality, SelectedData } from '../utils/types'
import PageWrapper from '../components/PageWrapper'
import { devices } from '../utils/devices'
import Layout from '../components/Layout'
import Footer from '../components/Footer/Footer'
import ComparisonTable from '../components/ComparisonTable'
import MapLabels from '../components/Map/MapLabels'
import ListIcon from '../public/icons/list.svg'
import MapIcon from '../public/icons/map.svg'
import ToggleButton from '../components/ToggleButton'
import {
  defaultDataset,
  datasetDescriptions,
  currentData,
  defaultDataView,
  secondaryDataView,
} from '../utils/datasetDescriptions'
import RadioButtonMenu from '../components/RadioButtonMenu'
import { listColumns, rankData } from '../utils/createMunicipalityList'
import {
  isValidDataView,
  isValidDataset,
  normalizeString,
  validDatasetsMap,
} from '../utils/shared'

const Map = dynamic(() => import('../components/Map/Map'))

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
`

const InfoText = styled.div`
  padding: 0 16px;
`

const ParagraphSource = styled(Paragraph)`
  font-size: 13px;
  color: ${({ theme }) => theme.grey};
`

const InfoContainer = styled.div`
  width: 100%;
  position: relative;
  background: ${({ theme }) => theme.lightBlack};
  border-radius: 8px;
  margin-bottom: 32px;
  z-index: 15;
  ::-webkit-scrollbar {
    display: none;
  }
`

const TitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const FloatingH5 = styled(H5Regular)`
  position: absolute;
  margin: 60px 0 0 16px;
  z-index: 200;

  @media only screen and (${devices.mobile}) {
    margin: 55px 0 0 16px;
  }
`

const ComparisonContainer = styled.div<{ $dataView: string }>`
  position: relative;
  overflow-y: scroll;
  z-index: 100;
  // TODO: Hardcoding this is not good.
  height: 400px;
  border-radius: 8px;
  display: flex;
  margin-top: ${({ $dataView }) => ($dataView === secondaryDataView ? '64px' : '0')};

  @media only screen and (${devices.tablet}) {
    height: 500px;
  }

  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  ::-webkit-scrollbar {
    /* Chrome, Safari and Opera */
    display: none;
  }
`

type PropsType = {
  municipalities: Array<Municipality>
}

function StartPage({ municipalities }: PropsType) {
  const router = useRouter()
  const routeDataset = router.query.dataset
  const { dataView } = router.query

  const normalizedRouteDataset = normalizeString(routeDataset as string)
  const normalizedDataView = normalizeString(dataView as string)

  const [selectedDataset, setSelectedDataset] = useState<SelectedData>(defaultDataset)
  const [selectedDataView, setSelectedDataView] = useState(normalizedDataView)

  useEffect(() => {
    if (normalizedRouteDataset && isValidDataset(normalizedRouteDataset)) {
      setSelectedDataset(validDatasetsMap[normalizedRouteDataset])
    }

    if (normalizedDataView && isValidDataView(normalizedDataView)) {
      setSelectedDataView(selectedDataView)
    }
    // Disable exhaustive-deps so that it only runs on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDataChange = (newData: SelectedData) => {
    const newDataString = newData as string
    setSelectedDataset(newDataString)
    const normalizedDataset = normalizeString(newDataString)
    router.push(`/${normalizedDataset}/${selectedDataView}`, undefined, {
      shallow: true,
      scroll: false,
    })
  }

  const municipalityNames = municipalities.map((item) => item.Name) // get all municipality names for drop down
  const municipalityData = currentData(municipalities, selectedDataset) // get all municipality names and data points for map and list
  const datasetDescription = datasetDescriptions[selectedDataset] // get description of selected dataset

  const handleToggle = () => {
    const newDataView = selectedDataView === defaultDataView ? secondaryDataView : defaultDataView
    setSelectedDataView(newDataView)
    router.replace(
      `/${normalizeString(selectedDataset as string)}/${newDataView}`,
      undefined,
      {
        shallow: true,
        scroll: false,
      },
    )
  }

  const cols = listColumns(selectedDataset, datasetDescription)
  const rankedData = rankData(municipalities, selectedDataset) // fixme hur byter jag ut denna till municipalityData?

  const isDefaultDataView = selectedDataView === defaultDataView

  return (
    <>
      <MetaTags
        title="Klimatkollen — Få koll på Sveriges klimatomställning"
        description="Hur går det med utsläppen i Sverige och i din kommun? Minskar eller ökar klimatutsläppen? Klarar vi Parisavtalet?"
      />
      <PageWrapper backgroundColor="black">
        <Container>
          <H2Regular>Hur går det med?</H2Regular>
          <RadioButtonMenu
            selectedData={selectedDataset}
            handleDataChange={handleDataChange}
          />
          <InfoContainer>
            <TitleContainer>
              <FloatingH5>{datasetDescription.title}</FloatingH5>
              <ToggleButton
                handleClick={handleToggle}
                text={isDefaultDataView ? 'Listvy' : 'Kartvy'}
                icon={isDefaultDataView ? <ListIcon /> : <MapIcon />}
              />
            </TitleContainer>
            <ComparisonContainer $dataView={selectedDataView.toString()}>
              {isDefaultDataView && (
                <>
                  <MapLabels
                    labels={datasetDescription.labels}
                    rotations={datasetDescription.labelRotateUp}
                  />
                  <Map
                    data={municipalityData}
                    boundaries={datasetDescription.boundaries}
                  />
                </>
              )}
              {selectedDataView === secondaryDataView && (
                <ComparisonTable data={rankedData[selectedDataset]} columns={cols} />
              )}
            </ComparisonContainer>
            <InfoText>
              <Paragraph>{datasetDescription.body}</Paragraph>
              <ParagraphSource>{datasetDescription.source}</ParagraphSource>
            </InfoText>
          </InfoContainer>
          <DropDown
            className="startpage"
            municipalitiesName={municipalityNames}
            placeholder="Hur går det i din kommun?"
          />
        </Container>
      </PageWrapper>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    'Cache-Control',
    `public, stale-while-revalidate=60, max-age=${60 * 60 * 24 * 7}`,
  )

  const normalizedDataset = normalizeString(defaultDataset)

  return {
    redirect: {
      destination: `/${normalizedDataset}/${defaultDataView}`,
      permanent: true,
    },
  }
}

export default StartPage

StartPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <>
      <Layout>{page}</Layout>
      <Footer />
    </>
  )
}
